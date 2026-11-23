import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminGuard';
import { readJSON } from '@/lib/utils';
import { createDelegationPdf } from '@/lib/delegationPdf';

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 });
  const delegations = await readJSON('delegations-mandats.json');
  const mandats = await readJSON('mandats.json');
  if (!Array.isArray(delegations) || !Array.isArray(mandats))
    return NextResponse.json({ error: 'Données indisponibles' }, { status: 503 });
  const d = delegations.find((x: any) => x.id === id);
  if (!d) return NextResponse.json({ error: 'Délégation introuvable' }, { status: 404 });
  const mandate = mandats.find((x: any) => x.id === d.mandatId);
  if (!mandate) return NextResponse.json({ error: "Mandat d'origine introuvable" }, { status: 409 });
  const bytes = await createDelegationPdf(d, mandate);
  const ref = String(mandate.mandateNumber || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 40);
  return new NextResponse(bytes as any, { headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="delegation-mandat${ref ? '-' + ref : ''}.pdf"`,
    'Cache-Control': 'private, no-store',
  } });
}
