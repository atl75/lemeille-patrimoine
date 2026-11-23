import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminGuard';
import { updateJSON, SANS_ECRITURE } from '@/lib/utils';
import { revisionCourante, verifierEcriture } from '@/lib/estimationDossier';
import { creerSnapshot } from '@/lib/estimationRapport';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 }); }
  if (verifierEcriture({}, body) === 'invalide') return NextResponse.json({ error: 'Version requise.' }, { status: 400 });
  const { id } = await params;
  let status = 404, error = 'Estimation introuvable.', snapshot: any = null;
  await updateJSON('estimations.json', (liste: any[]) => {
    status = 404; error = 'Estimation introuvable.'; snapshot = null;
    const e = liste.find(e => e.id === id);
    if (!e) return SANS_ECRITURE;
    const ancien = e.snapshots?.find((s: any) => s.id === body.requestId);
    if (ancien) { snapshot = ancien; status = 200; return SANS_ECRITURE; }
    if (revisionCourante(e) !== body.expectedRevision) { status = 409; error = 'Le dossier a changé. Rechargez avant de figer.'; return SANS_ECRITURE; }
    if ((e.snapshots?.length || 0) >= 30) { status = 400; error = '30 avis figés maximum par estimation. Créez une nouvelle estimation.'; return SANS_ECRITURE; }
    try { snapshot = creerSnapshot(e, body.requestId, new Date().toISOString()); }
    catch (err) { status = 400; error = (err as Error).message; return SANS_ECRITURE; }
    e.snapshots = [...(e.snapshots || []), snapshot]; status = 201;
    return liste;
  });
  return NextResponse.json(snapshot ? { snapshot } : { error }, { status });
}
