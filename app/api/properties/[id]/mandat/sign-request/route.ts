import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON, writeJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { Resend } from 'resend';
import crypto from 'crypto';

// Envoie au mandant l'invitation à signer le mandat en ligne. Silencieux si
// Resend n'est pas configuré ou si l'email échoue (le lien reste disponible).
async function sendSignInvite(to: string, name: string, url: string, mandateNumber: string) {
  if (!to || !process.env.RESEND_API_KEY) return false;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM || 'Lemeille Patrimoine <onboarding@resend.dev>';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1F3B2C">
        <h2 style="color:#B89C6D">Signature de votre mandat de vente</h2>
        <p>Bonjour ${name || ''},</p>
        <p>Votre mandat de vente${mandateNumber ? ` (N° ${mandateNumber})` : ''} est prêt à être signé. Vous pouvez le consulter et le signer en ligne, en quelques secondes :</p>
        <p style="text-align:center;margin:28px 0">
          <a href="${url}" style="background:#B89C6D;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Lire et signer le mandat</a>
        </p>
        <p style="font-size:13px;color:#555">Ou copiez ce lien : <br>${url}</p>
        <p style="font-size:12px;color:#999;margin-top:24px">NOVUS CAPITAL SAS — Arthur Lemeille — CPI 7606 2024 000 000 038 — 50 rue de la Garenne, 76130 Mont-Saint-Aignan.</p>
      </div>`;
    await resend.emails.send({
      from,
      to,
      subject: `Signature de votre mandat de vente${mandateNumber ? ` — N° ${mandateNumber}` : ''}`,
      html,
    });
    return true;
  } catch (e) {
    console.error('Erreur envoi invitation signature:', e);
    return false;
  }
}

// Crée (ou régénère) un lien de signature électronique pour le mandat d'un bien.
// Réservé à l'admin. Renvoie l'URL publique à transmettre au mandant.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const data = await readJSON('properties.json');
  const idx = data.findIndex((x: any) => x.id === id);
  if (idx < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const p = data[idx];
  const owner = Array.isArray(p.owners) && p.owners[0] ? p.owners[0] : null;
  const signerName = owner
    ? (owner.type === 'COMPANY' ? (owner.name || '') : [owner.firstName, owner.lastName].filter(Boolean).join(' '))
    : '';
  const signerEmail = owner?.email || '';
  const token = crypto.randomBytes(24).toString('hex');

  data[idx] = {
    ...p,
    mandateSignToken: token,
    mandateSignStatus: 'PENDING',
    mandateSignerName: signerName,
    mandateSignerEmail: signerEmail,
    mandateSignature: undefined, // réinitialise toute signature précédente
  };
  await writeJSON('properties.json', data);

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com';
  const url = `${base}/mandat/signer/${token}`;
  const emailed = await sendSignInvite(signerEmail, signerName, url, p.mandateNumber || '');
  return NextResponse.json({ token, url, signerName, signerEmail, emailed });
}
