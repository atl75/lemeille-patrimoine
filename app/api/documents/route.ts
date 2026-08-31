import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON, updateJSON, uid } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { buildDocumentPdf, type DocData } from '@/lib/documentPdf';
import { MAIL_COPY } from '@/lib/mailCopy';
import { EMAIL_SIGNATURE_HTML } from '@/lib/emailSignature';
import { propertyLabel } from '@/lib/propertyLabel';

// Envoie une copie du document signé au client (PDF en pièce jointe), Arthur en copie.
async function emailDocumentToClient(record: any, pdfB64: string, property: any) {
  const to = (record?.client?.email || '').trim();
  if (!/.+@.+\..+/.test(to) || !process.env.RESEND_API_KEY) return false;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const isOffre = record.type === 'OFFRE';
    const label = propertyLabel(property);
    const prenom = record.client?.firstName ? ` ${record.client.firstName}` : '';
    const intro = isOffre
      ? `Vous venez de signer une offre d'achat portant sur le bien suivant : <strong>${label}</strong>. Vous en trouverez copie en pièce jointe.`
      : `Vous venez de signer le bon de visite du bien suivant : <strong>${label}</strong>. Vous en trouverez copie en pièce jointe.`;
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'Lemeille Patrimoine <onboarding@resend.dev>',
      to,
      bcc: MAIL_COPY,
      subject: `${isOffre ? "Votre offre d'achat" : 'Votre bon de visite'} — ${label}`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#222;font-size:14px;line-height:1.55"><p>Bonjour${prenom},</p><p>${intro}</p><p>Je reste à votre disposition pour toute question.</p>${EMAIL_SIGNATURE_HTML}</div>`,
      attachments: [{ filename: `${record.number || 'document'}.pdf`, content: pdfB64 }],
    });
    return true;
  } catch (e) {
    console.error('Envoi du document au client échoué:', e);
    return false;
  }
}

const FILE = 'documents.json';

// GET : liste des documents (bons de visite / offres d'achat) pour l'admin.
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await readJSON(FILE);
  // Sans le PDF (trop lourd) — le PDF est servi via /api/documents/[id]/pdf.
  // Ni le PDF ni les signatures : docData embarque des images base64 qui
  // alourdiraient inutilement la liste.
  const list = (Array.isArray(data) ? data : []).map(
    ({ pdf, docData, ownerSignature, ownerSignToken, ...rest }: any) => rest
  );
  return NextResponse.json(list);
}

// POST : crée un bon de visite ou une offre d'achat signé(e).
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }); }

  const type = b.type === 'OFFRE' ? 'OFFRE' : 'VISITE';
  if (typeof b.signature?.dataUrl !== 'string' || !/^data:image\/png;base64,/.test(b.signature.dataUrl)) {
    return NextResponse.json({ error: 'Signature manquante.' }, { status: 400 });
  }
  const props = await readJSON('properties.json');
  const p = (Array.isArray(props) ? props : []).find((x: any) => x.id === b.propertyId);
  if (!p) return NextResponse.json({ error: 'Bien introuvable.' }, { status: 404 });

  // Numéro chronologique par type : V-AAAAMM-NN / O-AAAAMM-NN.
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = type === 'OFFRE' ? 'O' : 'V';
  const existing = await readJSON(FILE);
  const seq = (Array.isArray(existing) ? existing : []).filter((d: any) => d.type === type && (d.number || '').includes(ym)).length + 1;
  const number = `${prefix}-${ym}-${String(seq).padStart(2, '0')}`;

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || '';
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const docData: DocData = {
    type, number,
    property: {
      title: p.title, type: p.type, rooms: p.rooms, city: p.city, region: p.region,
      address: p.map?.query || '', price: p.price, surface: p.surface, cadastralReference: p.cadastralReference,
    },
    client: b.client || {},
    offerAmount: b.offerAmount != null ? Number(b.offerAmount) : undefined,
    atAskingPrice: !!b.atAskingPrice,
    sequestreAmount: b.sequestreAmount != null ? Number(b.sequestreAmount) : undefined,
    validityDays: b.validityDays != null ? Number(b.validityDays) : undefined,
    financing: b.financing === 'CREDIT' ? 'CREDIT' : 'COMPTANT',
    place: b.place || p.city || '',
    dateStr,
    owner: b.owner?.name || b.owner?.email ? { name: b.owner?.name || '', email: b.owner?.email || '' } : undefined,
    signature: { dataUrl: b.signature.dataUrl, mention: (b.signature.mention || (type === 'OFFRE' ? 'Bon pour offre' : 'Lu et approuvé')).toString().slice(0, 120), signedAt: now.toISOString(), ip },
  };

  let pdfDataUrl = '';
  try { const bytes = await buildDocumentPdf(docData); pdfDataUrl = 'data:application/pdf;base64,' + Buffer.from(bytes).toString('base64'); }
  catch (e) { console.error('Génération document échouée:', e); return NextResponse.json({ error: 'Échec de la génération du PDF.' }, { status: 500 }); }

  const record = {
    id: uid('doc'), createdAt: now.toISOString(), type, number,
    propertyId: p.id, propertyTitle: p.title || '', propertyCity: p.city || '',
    client: b.client || {}, offerAmount: docData.offerAmount, atAskingPrice: docData.atAskingPrice,
    sequestreAmount: docData.sequestreAmount, validityDays: docData.validityDays, financing: docData.financing,
    signedAt: now.toISOString(), pdf: pdfDataUrl,
    owner: docData.owner,
    // Conservé pour régénérer le PDF lorsque le vendeur accepte l'offre.
    docData,
    ownerSignStatus: type === 'OFFRE' && docData.owner?.email ? 'PENDING' : undefined,
  };
  await updateJSON(FILE, (data: any[]) => { (Array.isArray(data) ? data : []).push(record); return Array.isArray(data) ? data : [record]; });

  const emailed = await emailDocumentToClient(record, pdfDataUrl.split(',')[1] || '', p);

  return NextResponse.json({ ok: true, id: record.id, number, emailed });
}
