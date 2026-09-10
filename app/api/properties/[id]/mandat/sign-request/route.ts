import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SANS_ECRITURE, updateJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { EMAIL_SIGNATURE_HTML } from '@/lib/emailSignature';
import { envoyerEmail } from '@/lib/envoiEmail';
import crypto from 'crypto';

// Envoie au mandant l'invitation à signer le mandat en ligne. Rend la raison
// de l'échec le cas échéant : le lien reste utilisable à la main, mais l'agent
// doit savoir que le mandant n'a rien reçu.
async function sendSignInvite(to: string, name: string, url: string, mandateNumber: string) {
  const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1F3B2C">
        <h2 style="color:#B89C6D">Signature de votre mandat de vente</h2>
        <p>Bonjour ${name || ''},</p>
        <p>Votre mandat de vente${mandateNumber ? ` (N° ${mandateNumber})` : ''} est prêt à être signé. Vous pouvez le consulter et le signer en ligne, en quelques secondes :</p>
        <p style="text-align:center;margin:28px 0">
          <a href="${url}" style="background:#B89C6D;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Lire et signer le mandat</a>
        </p>
        <p style="font-size:13px;color:#555">Ou copiez ce lien : <br>${url}</p>
        ${EMAIL_SIGNATURE_HTML}
      </div>`;
  return envoyerEmail({
    to,
    subject: `Signature de votre mandat de vente${mandateNumber ? ` — N° ${mandateNumber}` : ''}`,
    html,
  });
}

// Crée (ou régénère) un lien de signature électronique pour le mandat d'un bien.
// Réservé à l'admin. Renvoie l'URL publique à transmettre au mandant.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const token = crypto.randomBytes(24).toString('hex');

  // Le jeton de signature est posé sous verrou : deux régénérations simultanées
  // laissaient un jeton actif que l'autre réponse ne connaissait pas.
  let trouve = false;
  let signerName = '';
  let signerEmail = '';
  let mandateNumber = '';
  await updateJSON('properties.json', (data: any[]) => {
    const idx = data.findIndex((x: any) => x.id === id);
    if (idx < 0) return SANS_ECRITURE;
    trouve = true;

    const p = data[idx];
    const owner = Array.isArray(p.owners) && p.owners[0] ? p.owners[0] : null;
    signerName = owner
      ? (owner.type === 'COMPANY' ? (owner.name || '') : [owner.firstName, owner.lastName].filter(Boolean).join(' '))
      : '';
    signerEmail = owner?.email || '';
    mandateNumber = p.mandateNumber || '';

    data[idx] = {
      ...p,
      mandateSignToken: token,
      mandateSignStatus: 'PENDING',
      mandateSignerName: signerName,
      mandateSignerEmail: signerEmail,
      mandateSignature: undefined, // réinitialise toute signature précédente
    };
    return data;
  });

  if (!trouve) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com';
  const url = `${base}/mandat/signer/${token}`;
  const envoi = await sendSignInvite(signerEmail, signerName, url, mandateNumber);
  return NextResponse.json({
    token, url, signerName, signerEmail,
    emailed: envoi.ok,
    // La raison remonte à l'écran : « envoyé » alors que rien n'est parti est
    // le pire des retours, car l'agent cesse alors de relancer son mandant.
    raison: envoi.ok ? undefined : envoi.raison,
  });
}
