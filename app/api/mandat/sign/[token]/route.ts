import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON, writeJSON } from '@/lib/utils';
import { buildMandatePdf } from '@/lib/mandatPdf';

// Route PUBLIQUE (non admin) : le mandant accède au mandat via un jeton unique
// et y appose sa signature électronique simple. Preuve capturée : horodatage,
// adresse IP, user-agent.

// Le jeton peut désigner un mandat autonome (mandats.json) ou, pour l'héritage,
// un bien (properties.json). On renvoie le fichier concerné pour l'écriture.
async function resolveByToken(token: string): Promise<{ file: string; data: any[]; idx: number } | null> {
  const mandats = await readJSON('mandats.json');
  const mi = (Array.isArray(mandats) ? mandats : []).findIndex((x: any) => x.mandateSignToken && x.mandateSignToken === token);
  if (mi >= 0) return { file: 'mandats.json', data: mandats, idx: mi };
  const props = await readJSON('properties.json');
  const pi = (Array.isArray(props) ? props : []).findIndex((x: any) => x.mandateSignToken && x.mandateSignToken === token);
  if (pi >= 0) return { file: 'properties.json', data: props, idx: pi };
  return null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await resolveByToken(token);
  if (!r) return NextResponse.json({ error: 'Lien de signature invalide ou expiré.' }, { status: 404 });
  const p = r.data[r.idx];
  const typeLabel = ((p.type || 'APPARTEMENT') === 'MAISON' ? 'Maison' : 'Appartement') + (p.rooms ? ` T${p.rooms}` : '');
  const address = p.map?.query || [p.city, String(p.region || '').replaceAll('_', ' ')].filter(Boolean).join(', ');
  return NextResponse.json({
    status: p.mandateSignStatus || 'PENDING',
    signed: p.mandateSignStatus === 'SIGNED',
    signerName: p.mandateSignerName || '',
    mandateNumber: p.mandateNumber || '',
    mandateType: p.mandateType || '',
    typeLabel,
    address,
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
  if (r.data[r.idx].mandateSignStatus === 'SIGNED') return NextResponse.json({ error: 'Ce mandat a déjà été signé.' }, { status: 409 });

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || '';
  const userAgent = (req.headers.get('user-agent') || '').slice(0, 400);

  r.data[r.idx] = {
    ...r.data[r.idx],
    mandateSignStatus: 'SIGNED',
    mandateSignerName: (body.signerName || r.data[r.idx].mandateSignerName || '').toString().slice(0, 200),
    mandateSignature: {
      dataUrl: body.dataUrl,
      mention: (body.mention || 'Bon pour mandat').toString().slice(0, 120),
      signedAt: new Date().toISOString(),
      ip,
      userAgent,
    },
  };

  // Archive automatiquement le mandat signé (PDF) dans l'enregistrement.
  try {
    const bytes = await buildMandatePdf(r.data[r.idx]);
    r.data[r.idx].mandate = 'data:application/pdf;base64,' + Buffer.from(bytes).toString('base64');
  } catch (e) {
    console.error('Archivage mandat signé échoué:', e);
  }

  await writeJSON(r.file, r.data);
  return NextResponse.json({ ok: true });
}
