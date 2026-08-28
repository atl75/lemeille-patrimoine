import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON, writeJSON, updateJSON } from '@/lib/utils';
import { buildMandatePdf } from '@/lib/mandatPdf';
import { MAIL_COPY } from '@/lib/mailCopy';
import { EMAIL_SIGNATURE_HTML } from '@/lib/emailSignature';

// Intègre le PDF du mandat signé dans les documents du bien concerné (champ
// « mandate » de la fiche), une fois le mandat autonome entièrement signé.
async function attachMandateToProperty(propertyId: string, pdfDataUrl: string) {
  if (!propertyId || !pdfDataUrl) return;
  try {
    await updateJSON('properties.json', (data: any[]) => {
      const list = Array.isArray(data) ? data : [];
      const i = list.findIndex((p: any) => p.id === propertyId);
      if (i >= 0) list[i] = { ...list[i], mandate: pdfDataUrl };
      return list;
    });
  } catch (e) { console.error('Intégration du mandat signé au bien échouée:', e); }
}

// Une fois le mandat entièrement signé, l'envoie par email au(x) mandant(s)
// avec le PDF signé en pièce jointe (Arthur en copie).
async function emailSignedMandate(rec: any) {
  try {
    if (!process.env.RESEND_API_KEY) return;
    const owners = Array.isArray(rec.owners) ? rec.owners : [];
    const to = Array.from(new Set<string>(owners.map((o: any) => (o?.email || '').trim()).filter((e: string) => /@/.test(e))));
    if (!to.length) return;
    const b64 = (rec.mandate || '').split(',')[1];
    if (!b64) return;
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const num = rec.mandateNumber ? ` N° ${rec.mandateNumber}` : '';
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'Lemeille Patrimoine <onboarding@resend.dev>',
      to,
      bcc: MAIL_COPY,
      subject: `Votre mandat de vente signé${num}`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#222;font-size:14px;line-height:1.5"><p>Bonjour,</p><p>Votre mandat de vente${num} a été signé par l'ensemble des parties. Vous en trouverez copie en pièce jointe.</p><p>Nous vous remercions de votre confiance.</p>${EMAIL_SIGNATURE_HTML}</div>`,
      attachments: [{ filename: `mandat-${rec.mandateNumber || 'vente'}.pdf`, content: b64 }],
    });
  } catch (e) { console.error('Envoi mandat signé échoué:', e); }
}

// Route PUBLIQUE : le mandant accède au mandat via un jeton unique et y appose
// sa signature électronique simple. Multi-signataires : chaque mandant a son
// propre jeton (mandat.signers[].token). Rétrocompatible : ancien jeton unique
// (mandat.mandateSignToken / property.mandateSignToken).

type Resolved = { file: string; data: any[]; idx: number; signerIndex: number };

async function resolveByToken(token: string): Promise<Resolved | null> {
  const mandats = await readJSON('mandats.json');
  const ms = Array.isArray(mandats) ? mandats : [];
  for (let i = 0; i < ms.length; i++) {
    const signers = Array.isArray(ms[i].signers) ? ms[i].signers : [];
    const si = signers.findIndex((s: any) => s.token && s.token === token);
    if (si >= 0) return { file: 'mandats.json', data: ms, idx: i, signerIndex: si };
    if (ms[i].mandateSignToken && ms[i].mandateSignToken === token) return { file: 'mandats.json', data: ms, idx: i, signerIndex: -1 };
  }
  const props = await readJSON('properties.json');
  const ps = Array.isArray(props) ? props : [];
  const pi = ps.findIndex((x: any) => x.mandateSignToken && x.mandateSignToken === token);
  if (pi >= 0) return { file: 'properties.json', data: ps, idx: pi, signerIndex: -1 };
  return null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await resolveByToken(token);
  if (!r) return NextResponse.json({ error: 'Lien de signature invalide ou expiré.' }, { status: 404 });
  const p = r.data[r.idx];
  const typeLabel = ((p.type || 'APPARTEMENT') === 'MAISON' ? 'Maison' : 'Appartement') + (p.rooms ? ` T${p.rooms}` : '');
  const address = p.map?.query || [p.city, String(p.region || '').replaceAll('_', ' ')].filter(Boolean).join(', ');

  if (r.signerIndex >= 0) {
    const s = p.signers[r.signerIndex];
    const total = p.signers.length;
    const signedCount = p.signers.filter((x: any) => !!x.dataUrl).length;
    return NextResponse.json({
      status: s.dataUrl ? 'SIGNED' : 'PENDING',
      signed: !!s.dataUrl,
      signerName: s.name || '',
      mandateNumber: p.mandateNumber || '',
      mandateType: p.mandateType || '',
      typeLabel, address,
      signedAt: s.signedAt || null,
      signerPosition: r.signerIndex + 1,
      signerTotal: total,
      othersSigned: signedCount,
    });
  }

  // Héritage : signature unique portée par l'enregistrement.
  return NextResponse.json({
    status: p.mandateSignStatus || 'PENDING',
    signed: p.mandateSignStatus === 'SIGNED',
    signerName: p.mandateSignerName || '',
    mandateNumber: p.mandateNumber || '',
    mandateType: p.mandateType || '',
    typeLabel, address,
    signedAt: p.mandateSignature?.signedAt || null,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }); }

  if (!body?.consent) return NextResponse.json({ error: 'Vous devez accepter les conditions pour signer.' }, { status: 400 });
  if (typeof body.dataUrl !== 'string' || !/^data:image\/png;base64,/.test(body.dataUrl)) {
    return NextResponse.json({ error: 'Signature manquante. Veuillez tracer votre signature.' }, { status: 400 });
  }
  if (body.dataUrl.length > 800_000) return NextResponse.json({ error: 'Signature trop volumineuse.' }, { status: 413 });

  const r = await resolveByToken(token);
  if (!r) return NextResponse.json({ error: 'Lien de signature invalide ou expiré.' }, { status: 404 });

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || '';
  const userAgent = (req.headers.get('user-agent') || '').slice(0, 400);
  const rec = r.data[r.idx];

  if (r.signerIndex >= 0) {
    const s = rec.signers[r.signerIndex];
    if (s.dataUrl) return NextResponse.json({ error: 'Vous avez déjà signé ce mandat.' }, { status: 409 });
    rec.signers[r.signerIndex] = {
      ...s,
      name: (body.signerName || s.name || '').toString().slice(0, 200),
      dataUrl: body.dataUrl,
      mention: (body.mention || 'Bon pour mandat').toString().slice(0, 120),
      signedAt: new Date().toISOString(),
      ip, userAgent,
    };
    const allSigned = rec.signers.every((x: any) => !!x.dataUrl);
    rec.mandateSignStatus = allSigned ? 'SIGNED' : 'PENDING';
    if (allSigned) {
      try { const bytes = await buildMandatePdf(rec); rec.mandate = 'data:application/pdf;base64,' + Buffer.from(bytes).toString('base64'); } catch (e) { console.error('Archivage mandat échoué:', e); }
    }
    r.data[r.idx] = rec;
    await writeJSON(r.file, r.data);
    if (allSigned) {
      // Mandat autonome signé par le(s) vendeur(s) : on l'ajoute aux documents du bien.
      if (r.file === 'mandats.json' && rec.propertyId && rec.mandate) await attachMandateToProperty(rec.propertyId, rec.mandate);
      await emailSignedMandate(rec);
    }
    return NextResponse.json({ ok: true, allSigned });
  }

  // Héritage : signature unique.
  if (rec.mandateSignStatus === 'SIGNED') return NextResponse.json({ error: 'Ce mandat a déjà été signé.' }, { status: 409 });
  r.data[r.idx] = {
    ...rec,
    mandateSignStatus: 'SIGNED',
    mandateSignerName: (body.signerName || rec.mandateSignerName || '').toString().slice(0, 200),
    mandateSignature: { dataUrl: body.dataUrl, mention: (body.mention || 'Bon pour mandat').toString().slice(0, 120), signedAt: new Date().toISOString(), ip, userAgent },
  };
  try { const bytes = await buildMandatePdf(r.data[r.idx]); r.data[r.idx].mandate = 'data:application/pdf;base64,' + Buffer.from(bytes).toString('base64'); } catch (e) { console.error('Archivage mandat échoué:', e); }
  await writeJSON(r.file, r.data);
  await emailSignedMandate(r.data[r.idx]);
  return NextResponse.json({ ok: true });
}
