import { NextResponse } from 'next/server';
import { readJSON, updateJSON, SANS_ECRITURE } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { champsEstimation, erreurDonneesEstimation, verifierEcriture, revisionCourante } from '@/lib/estimationDossier';

const FICHIER = 'estimations.json';

/** Champs que le client n'a pas le droit de réécrire. */

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const toutes = await readJSON(FICHIER, { fresh: true });
  const e = (Array.isArray(toutes) ? toutes : []).find((x: any) => x?.id === id);
  if (!e) return NextResponse.json({ error: 'Estimation introuvable.' }, { status: 404 });
  return NextResponse.json(e, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  let modifs: any;
  try { modifs = await req.json(); }
  catch { return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 }); }
  if (verifierEcriture({}, modifs) === 'invalide') return NextResponse.json({ error: 'Rechargez le dossier avant de le modifier.' }, { status: 400 });
  const propres = champsEstimation(modifs);
  const erreur = erreurDonneesEstimation(propres);
  if (erreur) return NextResponse.json({ error: erreur }, { status: 400 });

  // Lecture et écriture sous le même verrou : l'enregistrement automatique de
  // la page envoie une requête toutes les 1,5 s, et deux onglets ouverts sur
  // deux estimations s'effaçaient l'un l'autre avec un readJSON+writeJSON.
  let trouve = false;
  let conflit = false;
  let revision = 0;
  await updateJSON(FICHIER, (liste: any[]) => {
    trouve = false; conflit = false;
    const i = (Array.isArray(liste) ? liste : []).findIndex((x: any) => x?.id === id);
    if (i === -1) return SANS_ECRITURE;
    trouve = true;
    revision = revisionCourante(liste[i]);
    const controle = verifierEcriture(liste[i], modifs);
    if (controle === 'rejoue') return SANS_ECRITURE;
    if (controle !== 'ok') { conflit = true; return SANS_ECRITURE; }
    revision += 1;
    liste[i] = { ...liste[i], ...propres, id, revision, lastRequestId: modifs.requestId,
      createdAt: liste[i].createdAt, majAt: new Date().toISOString() };
    return liste;
  });

  if (!trouve) return NextResponse.json({ error: 'Estimation introuvable.' }, { status: 404 });
  if (conflit) return NextResponse.json({ error: 'Une autre version existe. Téléchargez votre saisie puis rechargez le dossier.' }, { status: 409 });
  return NextResponse.json({ ok: true, revision });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  let trouve = false;
  let archive = false;
  await updateJSON(FICHIER, (liste: any[]) => {
    trouve = false; archive = false;
    const i = (Array.isArray(liste) ? liste : []).findIndex((x: any) => x?.id === id);
    if (i === -1) return SANS_ECRITURE;
    trouve = true;
    if (liste[i].snapshots?.length) { archive = true; return SANS_ECRITURE; }
    liste.splice(i, 1);
    return liste;
  });

  if (!trouve) return NextResponse.json({ error: 'Estimation introuvable.' }, { status: 404 });
  if (archive) return NextResponse.json({ error: 'Ce dossier contient des avis figés et ne peut pas être supprimé.' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
