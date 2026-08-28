import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON, updateJSON } from '@/lib/utils';
import { buildDocumentPdf } from '@/lib/documentPdf';
import { MAIL_COPY } from '@/lib/mailCopy';
import { EMAIL_SIGNATURE_HTML } from '@/lib/emailSignature';

// Acceptation d'une offre d'achat par le propriétaire. Accès par jeton
// opaque : aucune authentification, mais aucune donnée sensible exposée non
// plus — seul le strict nécessaire à l'affichage est renvoyé.
async function find(token: string) {
  const data = await readJSON('documents.json');
  const arr = Array.isArray(data) ? data : [];
  const i = arr.findIndex((d: any) => d.ownerSignToken && d.ownerSignToken === token);
  return i >= 0 ? { doc: arr[i], idx: i } : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await find(token);
  if (!r) return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 404 });
  const d = r.doc;
  return NextResponse.json({
    number: d.number || '',
    ownerName: d.owner?.name || '',
    propertyTitle: d.propertyTitle || '',
    propertyCity: d.propertyCity || '',
    offerAmount: d.atAskingPrice ? undefined : d.offerAmount,
    atAskingPrice: !!d.atAskingPrice,
    signed: d.ownerSignStatus === 'SIGNED',
    signedAt: d.ownerSignedAt || null,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await find(token);
  if (!r) return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 404 });
  if (r.doc.ownerSignStatus === 'SIGNED') return NextResponse.json({ error: 'Cette offre a déjà été acceptée.' }, { status: 400 });

  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }); }
  const dataUrl = b?.signature?.dataUrl;
  if (typeof dataUrl !== 'string' || !/^data:image\/png;base64,/.test(dataUrl)) {
    return NextResponse.json({ error: 'Signature manquante.' }, { status: 400 });
  }
  const name = String(b?.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Votre nom est requis.' }, { status: 400 });
  if (!b?.consent) return NextResponse.json({ error: 'Le consentement est requis.' }, { status: 400 });

  const now = new Date();
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || '';
  const ownerSignature = { dataUrl, mention: 'Bon pour acceptation', signedAt: now.toISOString(), ip };

  // Régénération du PDF avec les deux signatures.
  const docData = { ...(r.doc.docData || {}), owner: { ...(r.doc.owner || {}), name }, ownerSignature };
  let pdfDataUrl = '';
  try {
    const bytes = await buildDocumentPdf(docData as any);
    pdfDataUrl = 'data:application/pdf;base64,' + Buffer.from(bytes).toString('base64');
  } catch (e) {
    console.error('Régénération du document échouée:', e);
    return NextResponse.json({ error: 'Échec de la génération du document.' }, { status: 500 });
  }

  await updateJSON('documents.json', (list: any[]) => {
    const arr = Array.isArray(list) ? list : [];
    const i = arr.findIndex((d: any) => d.ownerSignToken === token);
    if (i >= 0) {
      arr[i].ownerSignature = ownerSignature;
      arr[i].ownerSignStatus = 'SIGNED';
      arr[i].ownerSignedAt = now.toISOString();
      arr[i].owner = { ...(arr[i].owner || {}), name };
      arr[i].docData = docData;
      arr[i].pdf = pdfDataUrl;
    }
    return arr;
  });

  // Copie du document accepté aux deux parties.
  if (process.env.RESEND_API_KEY) {
    const to = [r.doc.owner?.email, r.doc.client?.email].map((e: any) => (e || '').trim()).filter((e: string) => /.+@.+\..+/.test(e));
    if (to.length) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM || 'Lemeille Patrimoine <onboarding@resend.dev>',
          to, bcc: MAIL_COPY,
          subject: `Offre d'achat ${r.doc.number || ''} — acceptée par le vendeur`,
          html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#222;font-size:14px;line-height:1.55">
            <p>Bonjour,</p>
            <p>L'offre d'achat portant sur <strong>${r.doc.propertyTitle || ''}</strong> a été acceptée par le vendeur. Vous en trouverez copie signée en pièce jointe.</p>
            <p>Je reviens vers vous pour la suite (compromis de vente).</p>
            ${EMAIL_SIGNATURE_HTML}</div>`,
          attachments: [{ filename: `${r.doc.number || 'offre'}-acceptee.pdf`, content: pdfDataUrl.split(',')[1] || '' }],
        });
      } catch (e) { console.error('Envoi offre acceptée échoué:', e); }
    }
  }

  return NextResponse.json({ ok: true });
}
