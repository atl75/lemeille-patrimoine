import { annoncesActives, mediane, prixM2, natureComparable, type Comparable } from './ajustementPrix.ts';
import { estimer, ajustementsDe, BAREME_COURANT } from './estimation.ts';
import { champsEstimation, cleRechercheDvf, erreurDonneesEstimation } from './estimationDossier.ts';
import { blocagesCaracteristiques } from './caracteristiquesEstimation.ts';
import { selectionDvf } from './selectionDvf.ts';

export function sourceRapport(e: any, dvf: any, comparables: Comparable[]): string {
  switch (e.sourceBase || 'DVF') {
    case 'DVF': return dvf?.stats ? `DVF : médiane de ${dvf.stats.nombre} ventes retenues` : 'DVF : référence indisponible';
    case 'COMPARABLES': return `Prix affichés : médiane de ${annoncesActives(comparables).filter(c => prixM2(c.prix,c.surface) !== null).length} annonces actives (pas des actes signés)`;
    case 'REFERENCE': return `Relevé de secteur : ${e.reference?.source || 'source non renseignée'}`;
    case 'MANUELLE': return 'Base saisie manuellement par l’agent';
    default: return 'Source non renseignée';
  }
}

/** Valeurs et références figées, jamais recalculées à l'ouverture d'une archive. */
export function creerSnapshot(e: any, id: string, date: string) {
  const estimation = champsEstimation(e);
  // Les anciens dossiers peuvent précéder la validation des sauvegardes.
  // Ne valider que le brouillon : les archives existantes restent immuables.
  const erreur = erreurDonneesEstimation(estimation);
  if (erreur) throw new Error(`Impossible de figer cet avis : ${erreur}`);
  const type = e.type === 'Maison' ? 'Maison' : 'Appartement';
  if(e.caracteristiques) {
    const blocages = blocagesCaracteristiques(e.caracteristiques,type);
    if(blocages.length)throw new Error(blocages.join(' '));
  }
  const comparables = Array.isArray(e.comparables) ? e.comparables : [];
  const observation = e.dvfObservation;
  const dvf = observation?.cle === cleRechercheDvf(e) ? selectionDvf(observation, type) : null;
  const source = e.sourceBase || 'DVF';
  const baseM2 = source === 'DVF' ? dvf?.stats?.medianeM2 : source === 'COMPARABLES'
    ? mediane(annoncesActives(comparables).map(c => prixM2(c.prix,c.surface)).filter((x): x is number => x !== null))
    : source === 'REFERENCE' ? e.reference?.m2 : e.baseManuelle;
  const resultat = estimer({ baseM2: Number(baseM2) || 0, surface: Number(e.surface) || 0,
    type, choix: e.criteres || {}, corrections: e.corrections || {}, caracteristiques: e.caracteristiques });
  if (!resultat || !String(e.adresse || '').trim()) throw new Error('Renseignez l’adresse, la surface et une source exploitable avant de figer.');
  if (![resultat.baseM2, resultat.m2Ajuste, resultat.valeur, resultat.bas, resultat.haut, resultat.valeurBrute].every(Number.isFinite)) {
    throw new Error('Résultat numérique hors limites. Vérifiez les montants et la surface avant de figer.');
  }
  return JSON.parse(JSON.stringify({ id, createdAt: date, rendererVersion: 4, bareme: BAREME_COURANT,
    props: { estimation: { ...estimation, majAt: date, rapportFige: true, rapportId: id,
      sourceLibelle: sourceRapport(e,dvf,comparables) }, resultat,
      ajustements: ajustementsDe(BAREME_COURANT,e.criteres || {},type,e.corrections || {},e.caracteristiques), dvf, comparables, type } }));
}

export const libelleNatureComparable = (c: Comparable) => ({
  ANNONCE: 'Prix affiché', VENTE_DECLAREE: 'Prix de vente déclaré (pièce à vérifier)', VENDU_SANS_PRIX: 'Vendu — ancien prix affiché, prix signé inconnu',
})[natureComparable(c)];
