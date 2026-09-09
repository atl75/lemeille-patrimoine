/**
 * DVF — les ventes réellement signées autour d'un bien.
 *
 * POURQUOI CETTE SOURCE. Une annonce affiche un prix DEMANDÉ ; DVF publie le
 * prix SIGNÉ, déclaré à la DGFiP. Face à un vendeur qui surestime, c'est
 * l'argument le plus difficile à contester : ce ne sont ni nos estimations ni
 * celles d'un concurrent, ce sont les actes.
 *
 * D'OÙ VIENNENT LES DONNÉES. Les fichiers geo-dvf publiés sur data.gouv.fr,
 * un CSV par commune et par année, licence ouverte. Mesuré : Rouen 2024 pèse
 * 1 Mo pour 6 353 lignes, Nice 3 Mo. On filtre année par année et on ne garde
 * que les lignes retenues — l'instance n'a qu'un gigaoctet.
 *
 * L'API communautaire api.cquest.org, que toute la documentation cite, répond
 * 502 : elle est morte. Les fichiers, eux, sont servis par data.gouv.fr avec
 * une redirection vers un stockage OVH, et répondent en moins d'une seconde.
 */

/** Une vente retenue, prête à être montrée. */
export type VenteDvf = {
  id: string;
  date: string;
  type: 'Appartement' | 'Maison';
  prix: number;
  surface: number;
  prixM2: number;
  pieces: number | null;
  adresse: string;
  /** Distance au bien, en mètres. */
  distance: number;
  /** Coordonnées, pour situer la vente sur une carte. */
  lat: number;
  lon: number;
};

/**
 * Distance approchée en mètres. La projection équirectangulaire suffit
 * amplement : on compare des biens à quelques centaines de mètres, pas des
 * trajectoires transatlantiques.
 */
export function distanceM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = (bLat - aLat) * 111320;
  const dLon = (bLon - aLon) * 111320 * Math.cos((aLat * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

export type OptionsDvf = {
  lat: number;
  lon: number;
  /** Rayon de recherche en mètres. */
  rayon: number;
  /** Ne garder qu'un type de local, si le bien comparé en a un. */
  type?: 'Appartement' | 'Maison' | null;
  /** Écart de surface toléré, en proportion (0.4 = ±40 %). */
  toleranceSurface?: number;
  surfaceRef?: number | null;
  /** Ne garder que les ventes à partir de cette année. */
  depuis?: number | null;
  /**
   * Bornes de surface explicites. Quand l'agent en pose au moins une, elles
   * REMPLACENT la tolérance automatique autour de la surface du bien : deux
   * filtres qui se superposent donnent un résultat que personne ne sait
   * expliquer devant un vendeur.
   */
  surfaceMin?: number | null;
  surfaceMax?: number | null;
  /** Typologie : nombre exact de pièces principales. */
  pieces?: number | null;
};

/** Bornes de vraisemblance : au-delà, c'est une anomalie de saisie. */
const PRIX_M2_MIN = 300;
const PRIX_M2_MAX = 25000;
const PRIX_MIN = 10000;
const SURFACE_MIN = 8;

/**
 * Lit un CSV geo-dvf et rend les ventes exploitables autour d'un point.
 *
 * TROIS PIÈGES, et ils ne sont pas théoriques — mesurés sur Rouen, 67 des 164
 * mutations proches portaient plusieurs lignes :
 *
 * 1. `valeur_fonciere` est le prix de TOUTE LA MUTATION, répété sur chacune de
 *    ses lignes. Un immeuble vendu d'un bloc donne dix lignes à 900 000 € ;
 *    diviser par la surface d'un seul logement donnerait dix fois le prix
 *    réel. On ne retient donc que les mutations comportant EXACTEMENT UN
 *    logement.
 * 2. Les dépendances (cave, parking) forment des lignes à part, sans surface.
 *    Les garder au sein de la mutation est normal — le prix les inclut — mais
 *    elles ne comptent jamais comme un bien.
 * 3. Un local commercial dans le même acte rend le prix mixte : on écarte.
 */
export function analyserCsvDvf(csv: string, o: OptionsDvf): VenteDvf[] {
  const lignes = csv.split('\n');
  if (lignes.length < 2) return [];

  const entetes = lignes[0].trim().split(',');
  const col = (nom: string) => entetes.indexOf(nom);
  const iMut = col('id_mutation'), iDate = col('date_mutation'),
    iNature = col('nature_mutation'), iValeur = col('valeur_fonciere'),
    iNum = col('adresse_numero'), iVoie = col('adresse_nom_voie'),
    iType = col('type_local'), iSurf = col('surface_reelle_bati'),
    iPieces = col('nombre_pieces_principales'),
    iLon = col('longitude'), iLat = col('latitude');
  if (iMut < 0 || iValeur < 0 || iLat < 0) return [];

  // Regroupement par mutation : c'est l'unité de l'acte, pas la ligne.
  const parMutation = new Map<string, string[][]>();
  for (let n = 1; n < lignes.length; n++) {
    const l = lignes[n];
    if (!l) continue;
    const c = l.split(',');
    if (c.length < entetes.length - 2) continue;
    const id = c[iMut];
    if (!id) continue;
    const g = parMutation.get(id);
    if (g) g.push(c); else parMutation.set(id, [c]);
  }

  const ventes: VenteDvf[] = [];
  for (const [id, rangs] of parMutation) {
    if (rangs[0][iNature] !== 'Vente') continue;

    const logements = rangs.filter(r => r[iType] === 'Appartement' || r[iType] === 'Maison');
    if (logements.length !== 1) continue;                       // piège 1
    if (rangs.some(r => (r[iType] || '').startsWith('Local'))) continue;  // piège 3

    const r = logements[0];
    const prix = Number(r[iValeur]);
    const surface = Number(r[iSurf]);
    const lat = Number(r[iLat]);
    const lon = Number(r[iLon]);
    if (!Number.isFinite(prix) || !Number.isFinite(surface) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (prix < PRIX_MIN || surface < SURFACE_MIN) continue;

    const m2 = prix / surface;
    if (m2 < PRIX_M2_MIN || m2 > PRIX_M2_MAX) continue;

    const type = r[iType] as 'Appartement' | 'Maison';
    if (o.type && type !== o.type) continue;

    const date = r[iDate] || '';
    if (o.depuis && Number(date.slice(0, 4)) < o.depuis) continue;
    if (o.pieces && Number(r[iPieces]) !== o.pieces) continue;

    const bornesPosees = (o.surfaceMin ?? 0) > 0 || (o.surfaceMax ?? 0) > 0;
    if (bornesPosees) {
      if (o.surfaceMin && surface < o.surfaceMin) continue;
      if (o.surfaceMax && surface > o.surfaceMax) continue;
    } else if (o.surfaceRef && o.toleranceSurface) {
      const ecart = Math.abs(surface - o.surfaceRef) / o.surfaceRef;
      if (ecart > o.toleranceSurface) continue;
    }

    const distance = distanceM(o.lat, o.lon, lat, lon);
    if (distance > o.rayon) continue;

    const pieces = Number(r[iPieces]);
    ventes.push({
      id, date: r[iDate], type, prix, surface, prixM2: m2,
      pieces: Number.isFinite(pieces) && pieces > 0 ? pieces : null,
      adresse: [r[iNum], r[iVoie]].filter(Boolean).join(' ').trim(),
      distance, lat, lon,
    });
  }

  return ventes;
}

export type StatsDvf = {
  nombre: number;
  medianeM2: number;
  /** Moyenne : demandée à l'affichage, mais la médiane reste la référence —
   *  une vente hors norme la déplace, pas la médiane. */
  moyenneM2: number;
  q1M2: number;
  q3M2: number;
  minM2: number;
  maxM2: number;
  /** Date de la vente la plus récente : dit au lecteur la fraîcheur réelle. */
  derniereVente: string;
};

const quantile = (tries: number[], p: number) => {
  const i = (tries.length - 1) * p;
  const bas = Math.floor(i), haut = Math.ceil(i);
  return bas === haut ? tries[bas] : tries[bas] + (tries[haut] - tries[bas]) * (i - bas);
};

export function statistiquesDvf(ventes: VenteDvf[]): StatsDvf | null {
  if (!ventes.length) return null;
  const m2 = ventes.map(v => v.prixM2).sort((a, b) => a - b);
  return {
    nombre: ventes.length,
    medianeM2: quantile(m2, 0.5),
    moyenneM2: m2.reduce((a, b) => a + b, 0) / m2.length,
    q1M2: quantile(m2, 0.25),
    q3M2: quantile(m2, 0.75),
    minM2: m2[0],
    maxM2: m2[m2.length - 1],
    derniereVente: ventes.map(v => v.date).sort().at(-1) as string,
  };
}

/** URL du fichier officiel pour une commune et une année. */
export function urlDvf(codeInsee: string, annee: number): string {
  // Le département tient sur les deux premiers caractères, sauf outre-mer
  // (971 à 976) où il en faut trois.
  const dep = /^9[7-8]/.test(codeInsee) ? codeInsee.slice(0, 3) : codeInsee.slice(0, 2);
  return `https://files.data.gouv.fr/geo-dvf/latest/csv/${annee}/communes/${dep}/${codeInsee}.csv`;
}

/** Les cinq dernières années publiées, la plus récente d'abord. */
export function anneesDvf(aujourdhui = new Date()): number[] {
  // DVF paraît deux fois l'an avec un décalage : l'année en cours n'est
  // complète qu'après coup. On remonte cinq millésimes.
  const a = aujourdhui.getFullYear();
  return [a, a - 1, a - 2, a - 3, a - 4];
}
