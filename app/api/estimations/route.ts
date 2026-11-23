import { NextResponse } from 'next/server';
import { readJSON, updateJSON, uid, SANS_ECRITURE } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { erreurDonneesEstimation } from '@/lib/estimationDossier';

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
  if (!corps || typeof corps !== 'object' || Array.isArray(corps)) return NextResponse.json({ error: 'Objet requis.' }, { status: 400 });
  const erreur = erreurDonneesEstimation(corps);
  if (erreur) return NextResponse.json({ error: erreur }, { status: 400 });

  const maintenant = new Date().toISOString();
  const creationKey = typeof corps?.creationKey === 'string' ? corps.creationKey.slice(0, 120) : undefined;
  let bien: any = null;
  if (corps?.propertyId) {
    const biens = await readJSON('properties.json');
    bien = biens.find((b: any) => b.id === corps.propertyId);
    if (!bien) return NextResponse.json({ error: 'Bien introuvable.' }, { status: 400 });
    if(bien.type==='IMMEUBLE') return NextResponse.json({error:'L’estimation standard maison/appartement ne couvre pas un immeuble entier. Préparez une analyse dédiée de ses lots et revenus.'},{status:400});
    corps = { ...corps, adresse: corps.adresse || bien.map?.query || bien.city,
      ville: bien.city, surface: bien.surface, pieces: bien.rooms, type: bien.type === 'MAISON' ? 'Maison' : 'Appartement' };
  }
  const estimation = {
    id: uid('est_'),
    createdAt: maintenant,
    majAt: maintenant,
    revision: 0,
    // Ne pas ignorer silencieusement les critères déjà importés depuis un lead.
    caracteristiques: corps.caracteristiques !== undefined ? corps.caracteristiques
      : Object.keys(corps.criteres || {}).some(k=>!['dpe','etat'].includes(k)) ? null : { version: 1 },
    creationKey,
    propertyId: bien?.id,
    leadId: corps?.leadId ? String(corps.leadId) : undefined,
    titre: String(corps?.titre ?? '').slice(0, 200) || 'Nouvelle estimation',
    /** « À la demande de … » en tête du document. */
    demandeur: String(corps?.demandeur ?? '').slice(0, 200) || undefined,
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

  let resultat = estimation, deja = false;
  await updateJSON(FICHIER, (liste: any[]) => {
    const existante = creationKey && liste.find(e => e.creationKey === creationKey);
    if (existante) { resultat = existante; deja = true; return SANS_ECRITURE; }
    resultat = estimation; deja = false;
    return [estimation, ...liste];
  });
  return NextResponse.json(resultat, { status: deja ? 200 : 201 });
}
