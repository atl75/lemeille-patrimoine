import { NextResponse } from 'next/server';
import { readJSON, updateJSON, uid } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';

/**
 * Les estimations de biens, préparées pour un vendeur.
 *
 * Une estimation vit SÉPARÉMENT du portefeuille : on estime un bien avant de
 * le rentrer, c'est même tout l'objet du rendez-vous. La relier à un bien
 * n'aurait donc de sens qu'après coup ; elle se relie à un LEAD VENDEUR, qui
 * lui existe dès le premier contact.
 */

const FICHIER = 'estimations.json';

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const toutes = await readJSON(FICHIER);
  return NextResponse.json(Array.isArray(toutes) ? toutes : []);
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let corps: any;
  try { corps = await req.json(); }
  catch { return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 }); }

  const maintenant = new Date().toISOString();
  const estimation = {
    id: uid('est_'),
    createdAt: maintenant,
    majAt: maintenant,
    leadId: corps?.leadId ? String(corps.leadId) : undefined,
    titre: String(corps?.titre ?? '').slice(0, 200) || 'Nouvelle estimation',
    adresse: String(corps?.adresse ?? '').slice(0, 300),
    ville: String(corps?.ville ?? '').slice(0, 120),
    type: corps?.type === 'Maison' ? 'Maison' : 'Appartement',
    surface: Number(corps?.surface) > 0 ? Number(corps.surface) : 0,
    pieces: Number(corps?.pieces) > 0 ? Number(corps.pieces) : 0,
    terrain: Number(corps?.terrain) > 0 ? Number(corps.terrain) : undefined,
    criteres: corps?.criteres && typeof corps.criteres === 'object' ? corps.criteres : {},
    comparables: [],
    dvfRayon: 300,
  };

  await updateJSON(FICHIER, (liste: any[]) => [estimation, ...(Array.isArray(liste) ? liste : [])]);
  return NextResponse.json(estimation, { status: 201 });
}
