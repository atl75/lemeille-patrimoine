import { NextResponse } from 'next/server';
import { readJSON, updateJSON, SANS_ECRITURE } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';

const FICHIER = 'estimations.json';

/** Champs que le client n'a pas le droit de réécrire. */
const FIGES = new Set(['id', 'createdAt']);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const toutes = await readJSON(FICHIER);
  const e = (Array.isArray(toutes) ? toutes : []).find((x: any) => x?.id === id);
  if (!e) return NextResponse.json({ error: 'Estimation introuvable.' }, { status: 404 });
  return NextResponse.json(e);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  let modifs: any;
  try { modifs = await req.json(); }
  catch { return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 }); }

  // Lecture et écriture sous le même verrou : l'enregistrement automatique de
  // la page envoie une requête toutes les 1,5 s, et deux onglets ouverts sur
  // deux estimations s'effaçaient l'un l'autre avec un readJSON+writeJSON.
  let trouve = false;
  await updateJSON(FICHIER, (liste: any[]) => {
    const i = (Array.isArray(liste) ? liste : []).findIndex((x: any) => x?.id === id);
    if (i === -1) return SANS_ECRITURE;
    trouve = true;
    const propres: any = {};
    for (const [k, v] of Object.entries(modifs || {})) if (!FIGES.has(k)) propres[k] = v;
    liste[i] = { ...liste[i], ...propres, id, createdAt: liste[i].createdAt, majAt: new Date().toISOString() };
    return liste;
  });

  if (!trouve) return NextResponse.json({ error: 'Estimation introuvable.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  let trouve = false;
  await updateJSON(FICHIER, (liste: any[]) => {
    const i = (Array.isArray(liste) ? liste : []).findIndex((x: any) => x?.id === id);
    if (i === -1) return SANS_ECRITURE;
    trouve = true;
    liste.splice(i, 1);
    return liste;
  });

  if (!trouve) return NextResponse.json({ error: 'Estimation introuvable.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
