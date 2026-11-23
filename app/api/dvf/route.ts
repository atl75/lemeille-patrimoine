import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminGuard';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { analyserCsvDvf, statistiquesDvf, anneesDvf, type VenteDvf } from '@/lib/dvf';
import { geocodeAddress } from '@/lib/geocoding';
import { createDvfSource } from '@/lib/dvfSource';
import { DvfSearchInterrupted, withDvfBudget } from '@/lib/dvfBudget';

/**
 * Les ventes réellement signées autour d'une adresse.
 *
 * Deux services publics, gratuits, sans jeton : la Géoplateforme IGN (BAN) pour
 * situer l'adresse exacte, puis les fichiers geo-dvf de data.gouv.fr pour les
 * mutations. Aucun hôte n'est fourni par l'utilisateur — ils sont en dur —
 * donc pas de question de requête sortante détournée ici.
 */

/**
 * Les CSV de commune pèsent de 1 à 3 Mo. L'instance n'a qu'un gigaoctet et ne
 * tourne qu'en un exemplaire : on garde les huit derniers fichiers, pas plus,
 * et six heures — DVF ne bouge que deux fois l'an.
 */
const csvCommune = createDvfSource();

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

  if (typeof corps?.adresse !== 'string') return NextResponse.json({ error: 'Adresse manquante ou invalide.' }, { status: 400 });
  const adresse = corps.adresse.trim().slice(0, 200);
  if (!adresse) return NextResponse.json({ error: 'Adresse manquante.' }, { status: 400 });

  const rayon = Math.min(Math.max(Number(corps?.rayon) || 300, 50), 2000);
  const type = corps?.type === 'Maison' || corps?.type === 'Appartement' ? corps.type : null;
  const surfaceRef = Number(corps?.surface) > 0 ? Number(corps.surface) : null;
  // Filtres demandés par l'agent : à partir de quelle année, et quelle
  // typologie. Une vente de 2021 ne pèse pas comme une de l'an dernier.
  const depuis = Number(corps?.depuis) > 1900 ? Number(corps.depuis) : null;
  const pieces = Number(corps?.pieces) > 0 ? Number(corps.pieces) : null;
  const surfaceMin = Number(corps?.surfaceMin) > 0 ? Number(corps.surfaceMin) : null;
  const surfaceMax = Number(corps?.surfaceMax) > 0 ? Number(corps.surfaceMax) : null;
  const terrainMin = Number(corps?.terrainMin) > 0 ? Number(corps.terrainMin) : null;
  const terrainMax = Number(corps?.terrainMax) > 0 ? Number(corps.terrainMax) : null;

  try {
    return await withDvfBudget(async ({ signal, check }) => {
      // 1. Situer l'adresse. Le score et le type disent au lecteur si l'on est au
      //    numéro près ou seulement dans la rue.
      let point: { lat: number; lon: number; insee: string; label: string; precision: string; score: number };
      try {
        const result = await geocodeAddress(adresse, { signal });
        check();
        if (!result) return NextResponse.json({ error: 'Adresse introuvable.' }, { status: 404 });
        point = result;
      } catch {
        check();
        return NextResponse.json({ error: "Le service d'adresses est indisponible. Réessayez dans un instant." }, { status: 502 });
      }

      // 2. Cinq millésimes, filtrés au fil de l'eau : on ne garde jamais plus d'un
      //    CSV en mémoire vive au-delà du cache.
      const toutes: VenteDvf[] = [];
      const anneesTrouvees: number[] = [];
      const anneesAbsentes: number[] = [];
      const anneesDemandees = anneesDvf();
      for (const annee of anneesDemandees) {
        check();
        const source = await csvCommune(point.insee, annee, signal);
        check();
        if (source.status === 'error') return NextResponse.json({
          error: `Les données DVF de ${annee} n’ont pas pu être chargées. Aucun résultat partiel n’est présenté. Réessayez dans un instant.`,
        }, { status: 502 });
        if (source.status === 'absent') { anneesAbsentes.push(annee); continue; }
        anneesTrouvees.push(annee);
        toutes.push(...analyserCsvDvf(source.csv, {
          lat: point.lat, lon: point.lon, rayon, type,
          surfaceRef, toleranceSurface: surfaceRef ? 0.5 : undefined,
          depuis, pieces, surfaceMin, surfaceMax, terrainMin, terrainMax,
        }));
        check();
      }
      if (!anneesTrouvees.length) return NextResponse.json({
        error: 'Aucun fichier DVF n’est disponible pour cette commune sur les années recherchées. Cela ne signifie pas qu’aucune vente n’a eu lieu.',
      }, { status: 404 });

      // La plus récente d'abord : c'est celle qui pèse dans une négociation.
      toutes.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.distance - b.distance));
      check();

      return NextResponse.json({
        adresse: point.label,
        // Le centre sert à cadrer la carte des ventes.
        lat: point.lat,
        lon: point.lon,
        precision: point.precision,
        score: point.score,
        rayon,
        depuis, pieces, surfaceMin, surfaceMax, terrainMin, terrainMax,
        annees: anneesTrouvees,
        anneesAbsentes,
        information: `Millésimes consultés : ${anneesTrouvees.join(', ')}.${anneesAbsentes.length ? ` Fichiers non disponibles : ${anneesAbsentes.join(', ')}. Les résultats ne couvrent que les fichiers consultés.` : ''}`,
        // Assez de points pour que le graphique montre le MÊME effectif que le
        // constat : un lecteur qui compte « 200 » sous un titre annonçant 568
        // a raison de douter du reste.
        ventes: toutes.slice(0, 900),
        stats: statistiquesDvf(toutes),
      });
    }, { signal: req.signal });
  } catch (error) {
    if (error instanceof DvfSearchInterrupted) return NextResponse.json({
      error: error.reason === 'deadline'
        ? 'La recherche DVF a dépassé son délai global. Aucun résultat partiel n’est présenté. Réessayez dans un instant.'
        : 'La recherche DVF a été interrompue. Aucun résultat partiel n’est présenté.',
    }, { status: 504 });
    throw error;
  }
}
