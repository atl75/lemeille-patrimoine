import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminGuard';
import { readJSON } from '@/lib/utils';
import { createDelegationPdf } from '@/lib/delegationPdf';
import { referenceCadastraleMandat } from '@/lib/referenceCadastraleMandat';
import { mandatAvecCadastrePourDelegation } from '@/lib/cadastreDelegation';

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 });
  const delegations = await readJSON('delegations-mandats.json');
  const mandats = await readJSON('mandats.json', { fresh: true });
  if (!Array.isArray(delegations) || !Array.isArray(mandats))
    return NextResponse.json({ error: 'Données indisponibles' }, { status: 503 });
  const d = delegations.find((x: any) => x.id === id);
  if (!d) return NextResponse.json({ error: 'Délégation introuvable' }, { status: 404 });
  const mandate = mandats.find((x: any) => x.id === d.mandatId);
  if (!mandate) return NextResponse.json({ error: "Mandat d'origine introuvable" }, { status: 409 });
  let exportMandate = mandate;
  if (!referenceCadastraleMandat(mandate) && typeof mandate.propertyId === 'string' && mandate.propertyId.trim()) {
    try {
      exportMandate = mandatAvecCadastrePourDelegation(mandate, await readJSON('properties.json', { fresh: true }));
    } catch {
      return NextResponse.json({ error: 'Les données du bien lié sont indisponibles ou ambiguës. Réessayez avant de télécharger la délégation.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
    }
  }
  let bytes: Uint8Array;
  try {
    const agency = await readJSON('configuration/signature-delegant-20261123.json', { fresh: true });
    if (typeof agency?.jpegBase64 !== 'string' || !agency.jpegBase64 || agency.jpegBase64.length > 4_000_000)
      throw new Error('Signature indisponible');
    bytes = await createDelegationPdf(d, exportMandate, { signatureJpeg: Buffer.from(agency.jpegBase64, 'base64') });
  } catch {
    return NextResponse.json({ error: 'La signature Novus Capital est momentanément indisponible. Réessayez avant de télécharger le document.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  }
  const ref = String(mandate.mandateNumber || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 40);
  return new NextResponse(bytes as any, { headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="delegation-mandat${ref ? '-' + ref : ''}.pdf"`,
    'Cache-Control': 'private, no-store',
  } });
}
