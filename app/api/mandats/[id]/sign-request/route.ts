import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON, writeJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import crypto from 'crypto';

// Crée (ou régénère) le lien de signature électronique d'un mandat autonome.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const data = await readJSON('mandats.json');
  const i = (Array.isArray(data) ? data : []).findIndex((x: any) => x.id === id);
  if (i < 0) return NextResponse.json({ error: 'Mandat non trouvé' }, { status: 404 });

  const m = data[i];
  const owner = Array.isArray(m.owners) && m.owners[0] ? m.owners[0] : null;
  const signerName = m.mandateSignerName
    || (owner ? (owner.type === 'COMPANY' ? (owner.name || '') : [owner.firstName, owner.lastName].filter(Boolean).join(' ')) : '');
  const signerEmail = m.mandateSignerEmail || owner?.email || '';
  const token = crypto.randomBytes(24).toString('hex');

  data[i] = {
    ...m,
    mandateSignToken: token,
    mandateSignStatus: 'PENDING',
    mandateSignerName: signerName,
    mandateSignerEmail: signerEmail,
  };
  await writeJSON('mandats.json', data);

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com';
  const url = `${base}/mandat/signer/${token}`;

  // Envoi email optionnel (silencieux si Resend non configuré).
  let emailed = false;
  if (signerEmail && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'Lemeille Patrimoine <onboarding@resend.dev>',
        to: signerEmail,
        subject: `Signature de votre mandat de vente${m.mandateNumber ? ` — N° ${m.mandateNumber}` : ''}`,
        html: `<p>Bonjour ${signerName || ''},</p><p>Votre mandat de vente${m.mandateNumber ? ` (N° ${m.mandateNumber})` : ''} est prêt à être signé :</p><p><a href="${url}">Lire et signer le mandat</a></p><p style="font-size:12px;color:#999">${url}</p>`,
      });
      emailed = true;
    } catch { emailed = false; }
  }

  return NextResponse.json({ url, emailed, signerEmail });
}
