/**
 * Périodes d'observation des statistiques de visite.
 *
 * Le tableau de bord était figé sur 28 jours, codé en dur dans lib/ga4.ts. Une
 * seule fenêtre ne répond pas aux mêmes questions : la semaine dit si une
 * annonce publiée lundi a porté, l'année dit si le trafic progresse.
 *
 * LE GRAIN SUIT LA FENÊTRE. Sur un an, un point par jour donne 365 points
 * illisibles dans un graphique de 240 pixels de haut : l'année s'agrège donc
 * par mois. GA4 le fait côté serveur, via la dimension yearMonth.
 */
export type ClePeriode = 'semaine' | 'mois' | 'annee';

export type Periode = {
  label: string;
  /** Borne de début au format GA4 relatif. */
  debut: string;
  /** Dimension GA4 de la courbe : un point par jour, ou par mois. */
  dimension: 'date' | 'yearMonth';
  titreCourbe: string;
  /** Rappel de la fenêtre, affiché sous le titre de la section. */
  intitule: string;
};

export const PERIODES: Record<ClePeriode, Periode> = {
  semaine: {
    label: 'Semaine', debut: '7daysAgo', dimension: 'date',
    titreCourbe: 'Fréquentation quotidienne', intitule: '7 derniers jours',
  },
  mois: {
    label: 'Mois', debut: '30daysAgo', dimension: 'date',
    titreCourbe: 'Fréquentation quotidienne', intitule: '30 derniers jours',
  },
  annee: {
    label: 'Année', debut: '365daysAgo', dimension: 'yearMonth',
    titreCourbe: 'Fréquentation mensuelle', intitule: '12 derniers mois',
  },
};

export const PERIODE_PAR_DEFAUT: ClePeriode = 'mois';

/**
 * Normalise ce qui arrive de l'URL. Une valeur inconnue ne doit pas faire
 * échouer la requête GA : on retombe sur le mois, qui est ce que le tableau de
 * bord affichait jusqu'ici.
 */
export function periodeValide(v: unknown): ClePeriode {
  const k = String(v ?? '').toLowerCase();
  return (k in PERIODES ? k : PERIODE_PAR_DEFAUT) as ClePeriode;
}

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/**
 * Étiquette d'un point de la courbe. GA4 renvoie « 20260908 » pour un jour et
 * « 202609 » pour un mois : la longueur suffit à les distinguer.
 */
export function etiquettePoint(d: string): string {
  if (/^\d{8}$/.test(d)) return `${d.slice(6, 8)}/${d.slice(4, 6)}`;
  if (/^\d{6}$/.test(d)) return `${MOIS[Number(d.slice(4, 6)) - 1] ?? d.slice(4, 6)} ${d.slice(0, 4)}`;
  return d;
}

/**
 * Plage réellement couverte par les points reçus, en clair.
 *
 * Utile parce que la propriété GA4 du site ne porte de données que depuis sa
 * mise en service : demander un an n'en crée pas pour autant. Mieux vaut
 * afficher la période réelle que laisser croire à un compteur en panne.
 */
export function plageCouverte(points: { date: string }[]): string | null {
  const dates = points.map((p) => p.date).filter(Boolean).sort();
  if (!dates.length) return null;
  const bornes = [dates[0], dates[dates.length - 1]].map(etiquettePoint);
  return bornes[0] === bornes[1] ? bornes[0] : `${bornes[0]} → ${bornes[1]}`;
}
