import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON, updateJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { MAIL_COPY } from '@/lib/mailCopy';
import { EMAIL_SIGNATURE_HTML } from '@/lib/emailSignature';
import crypto from 'crypto';

// Envoie au propriétaire une demande d'acceptation de l'offre : un lien
// personnel (jeton opaque, sans authentification) vers la page de lecture puis
// de signature. Même mécanique que la signature du mandat.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const data = await readJSON('documents.json');
  const doc = (Array.isArray(data) ? data : []).find((d: any) => d.id === id);
  if (!doc) return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 });
  if (doc.type !== 'OFFRE') return NextResponse.json({ error: "Seule une offre d'achat peut être acceptée par le vendeur." }, { status: 400 });
  if (doc.ownerSignStatus === 'SIGNED') return NextResponse.json({ error: 'Cette offre a déjà été acceptée.' }, { status: 400 });

  let body: any = {};
  try { body = await req.json(); } catch { /* corps facultatif */ }
  const name = (body.name || doc.owner?.name || '').trim();
  const to = (body.email || doc.owner?.email || '').trim();
  if (!/.+@.+\..+/.test(to)) return NextResponse.json({ error: "Email du propriétaire invalide." }, { status: 400 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "Envoi d'email non configuré." }, { status: 500 });

  const token = doc.ownerSignToken || crypto.randomBytes(24).toString('hex');
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com';
  const link = `${base}/offre/signer/${token}`;

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'Lemeille Patrimoine <onboarding@resend.dev>',
      to,
      bcc: MAIL_COPY,
      subject: `Offre d'achat ${doc.number || ''} — votre acceptation`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#222;font-size:14px;line-height:1.55">
        <p>Bonjour${name ? ` ${name}` : ''},</p>
        <p>Une offre d'achat a été formulée sur votre bien <strong>${doc.propertyTitle || ''}</strong>${doc.propertyCity ? ` (${doc.propertyCity})` : ''}.</p>
        <p>Vous pouvez la consulter intégralement puis, si vous l'acceptez, la signer électroniquement :</p>
        <p><a href="${link}" style="display:inline-block;background:#B89C6D;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Lire et accepter l'offre</a></p>
        <p style="font-size:12px;color:#666">Ce lien vous est personnel. La signature ne sera proposée qu'après lecture complète du document.</p>
        ${EMAIL_SIGNATURE_HTML}</div>`,
    });
  } catch (e) {
    console.error("Envoi demande d'acceptation échoué:", e);
    return NextResponse.json({ error: "L'email n'a pas pu être envoyé." }, { status: 500 });
  }

  await updateJSON('documents.json', (list: any[]) => {
    const arr = Array.isArray(list) ? list : [];
    const i = arr.findIndex((d: any) => d.id === id);
    if (i >= 0) {
      arr[i].ownerSignToken = token;
      arr[i].ownerSignStatus = 'PENDING';
      arr[i].owner = { name, email: to };
      arr[i].ownerRequestedAt = new Date().toISOString();
    }
    return arr;
  });

  return NextResponse.json({ ok: true, sentTo: to });
}
