import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminGuard';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { analyserCsvDvf, statistiquesDvf, urlDvf, anneesDvf, type VenteDvf } from '@/lib/dvf';

/**
 * Les ventes réellement signées autour d'une adresse.
 *
 * Deux services publics, gratuits, sans jeton : l'API Adresse (BAN) pour
 * situer l'adresse exacte, puis les fichiers geo-dvf de data.gouv.fr pour les
 * mutations. Aucun hôte n'est fourni par l'utilisateur — ils sont en dur —
 * donc pas de question de requête sortante détournée ici.
 */

/**
 * Les CSV de commune pèsent de 1 à 3 Mo. L'instance n'a qu'un gigaoctet et ne
 * tourne qu'en un exemplaire : on garde les huit derniers fichiers, pas plus,
 * et six heures — DVF ne bouge que deux fois l'an.
 */
const CACHE = new Map<string, { csv: string; a: number }>();
const CACHE_MAX = 8;
const CACHE_MS = 6 * 60 * 60 * 1000;

async function csvCommune(insee: string, annee: number): Promise<string | null> {
  const cle = `${insee}:${annee}`;
  const vu = CACHE.get(cle);
  if (vu && Date.now() - vu.a < CACHE_MS) return vu.csv;

  try {
    const r = await fetch(urlDvf(insee, annee), {
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': 'LemeillePatrimoine/1.0 (+https://lemeillepatrimoine.com)' },
    });
    // Une année non encore publiée répond 404 : ce n'est pas une erreur.
    if (!r.ok) return null;
    const csv = await r.text();
    CACHE.set(cle, { csv, a: Date.now() });
    // Éviction du plus ancien : une Map conserve l'ordre d'insertion.
    while (CACHE.size > CACHE_MAX) CACHE.delete(CACHE.keys().next().value as string);
    return csv;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = rateLimit('dvf:' + ip, 40, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de recherches, merci de patienter quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    );
  }

  let corps: any;
  try { corps = await req.json(); }
  catch { return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 }); }

  const adresse = String(corps?.adresse ?? '').trim().slice(0, 200);
  if (!adresse) return NextResponse.json({ error: 'Adresse manquante.' }, { status: 400 });

  const rayon = Math.min(Math.max(Number(corps?.rayon) || 300, 50), 2000);
  const type = corps?.type === 'Maison' || corps?.type === 'Appartement' ? corps.type : null;
  const surfaceRef = Number(corps?.surface) > 0 ? Number(corps.surface) : null;

  // 1. Situer l'adresse. Le score et le type disent au lecteur si l'on est au
  //    numéro près ou seulement dans la rue.
  let point: { lat: number; lon: number; insee: string; label: string; precision: string; score: number };
  try {
    const g = await fetch(
      'https://api-adresse.data.gouv.fr/search/?limit=1&q=' + encodeURIComponent(adresse),
      { signal: AbortSignal.timeout(10000) },
    );
    const d = await g.json();
    const f = d?.features?.[0];
    if (!f) return NextResponse.json({ error: 'Adresse introuvable.' }, { status: 404 });
    point = {
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      insee: f.properties.citycode,
      label: f.properties.label,
      precision: f.properties.type,
      score: f.properties.score,
    };
  } catch {
    return NextResponse.json({ error: "Le service d'adresses n'a pas répondu." }, { status: 502 });
  }

  // 2. Cinq millésimes, filtrés au fil de l'eau : on ne garde jamais plus d'un
  //    CSV en mémoire vive au-delà du cache.
  const toutes: VenteDvf[] = [];
  const anneesTrouvees: number[] = [];
  for (const annee of anneesDvf()) {
    const csv = await csvCommune(point.insee, annee);
    if (!csv) continue;
    anneesTrouvees.push(annee);
    toutes.push(...analyserCsvDvf(csv, {
      lat: point.lat, lon: point.lon, rayon, type,
      surfaceRef, toleranceSurface: surfaceRef ? 0.5 : undefined,
    }));
  }

  // La plus récente d'abord : c'est celle qui pèse dans une négociation.
  toutes.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.distance - b.distance));

  return NextResponse.json({
    adresse: point.label,
    precision: point.precision,
    score: point.score,
    rayon,
    annees: anneesTrouvees,
    // Assez de points pour que le graphique montre le MÊME effectif que le
    // constat : un lecteur qui compte « 200 » sous un titre annonçant 568
    // a raison de douter du reste.
    ventes: toutes.slice(0, 900),
    stats: statistiquesDvf(toutes),
  });
}
