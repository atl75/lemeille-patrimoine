import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON, writeJSON } from '@/lib/utils';

// Route PUBLIQUE (non admin) : le mandant accède au mandat via un jeton unique
// et y appose sa signature électronique simple. Preuve capturée : horodatage,
// adresse IP, user-agent.

function findByToken(data: any[], token: string) {
  return data.findIndex((x: any) => x.mandateSignToken && x.mandateSignToken === token);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await readJSON('properties.json');
  const idx = findByToken(data, token);
  if (idx < 0) return NextResponse.json({ error: 'Lien de signature invalide ou expiré.' }, { status: 404 });
  const p = data[idx];
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

  const data = await readJSON('properties.json');
  const idx = findByToken(data, token);
  if (idx < 0) return NextResponse.json({ error: 'Lien de signature invalide ou expiré.' }, { status: 404 });
  if (data[idx].mandateSignStatus === 'SIGNED') return NextResponse.json({ error: 'Ce mandat a déjà été signé.' }, { status: 409 });

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || '';
  const userAgent = (req.headers.get('user-agent') || '').slice(0, 400);

  data[idx] = {
    ...data[idx],
    mandateSignStatus: 'SIGNED',
    mandateSignerName: (body.signerName || data[idx].mandateSignerName || '').toString().slice(0, 200),
    mandateSignature: {
      dataUrl: body.dataUrl,
      mention: (body.mention || 'Bon pour mandat').toString().slice(0, 120),
      signedAt: new Date().toISOString(),
      ip,
      userAgent,
    },
  };
  await writeJSON('properties.json', data);
  return NextResponse.json({ ok: true });
}
