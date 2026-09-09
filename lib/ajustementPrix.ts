/**
 * Argumentaire de baisse de prix : comparer un bien à ses concurrents.
 *
 * Sert l'entretien où l'on explique à un vendeur que son prix le sort du
 * marché. L'argument qui porte n'est pas une opinion, c'est un écart chiffré
 * face à des biens que l'acquéreur voit en même temps que le sien.
 *
 * CE MODULE NE FAIT QUE CALCULER. Aucune donnée n'y est inventée : les
 * comparables viennent du portefeuille ou d'une saisie, et les résultats
 * portent toujours leur effectif, parce qu'une médiane sur deux biens ne
 * vaut pas une médiane sur dix.
 *
 * VOCABULAIRE. Les fonctions reçoivent le bien tel que l'application le stocke
 * — `price`, `surface`, `netSellerAmount` — et non un objet traduit. Une
 * première version lisait `bien.prix` : comme tous ces champs sont optionnels,
 * TypeScript acceptait l'appel sans broncher et la page affichait « ajoutez un
 * concurrent » alors qu'il y en avait trois.
 */

export type StatutComparable = 'EN_VENTE' | 'VENDU';

export type Comparable = {
  id: string;
  titre: string;
  ville?: string;
  /** Prix affiché aujourd'hui, ou prix affiché à l'époque si le bien est vendu. */
  prix: number;
  surface: number;
  /** Prix réellement signé, quand il est connu — c'est l'argument le plus fort. */
  prixVente?: number;
  statut?: StatutComparable;
  /**
   * Date de parution de l'annonce.
   *
   * Ce n'est pas un détail d'archivage : un bien affiché depuis six mois au
   * même prix est, à lui seul, la démonstration que ce prix ne trouve pas
   * preneur. C'est souvent l'argument qui porte le plus auprès d'un vendeur
   * qui compare son bien aux annonces voisines sans regarder leur ancienneté.
   */
  dateParution?: string;
  /**
   * Étiquette énergie, de A à G. Deux biens identiques ne valent pas le même
   * prix si l'un est en F : depuis les interdictions de location par étiquette,
   * l'acquéreur le chiffre lui-même.
   */
  dpe?: string;
  /** Étage. Texte libre : « 3 », « RDC », « 5 sans ascenseur ». */
  etage?: string;
  source?: string;
  lien?: string;
  note?: string;
};

/** Prix au mètre carré, ou null si la surface manque. */
export function prixM2(prix?: number | null, surface?: number | null): number | null {
  const p = Number(prix), s = Number(surface);
  if (!Number.isFinite(p) || !Number.isFinite(s) || s <= 0 || p <= 0) return null;
  return p / s;
}

/**
 * Prix au m² retenu pour un comparable : celui de la VENTE si elle est connue,
 * sinon celui affiché. Un bien vendu 10 % sous son affichage informe sur le
 * marché réel, pas sur les espoirs de son vendeur.
 */
export function m2Retenu(c: Comparable): number | null {
  return prixM2(c.prixVente ?? c.prix, c.surface);
}

export function mediane(valeurs: number[]): number | null {
  const v = valeurs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export type Statistiques = {
  nombre: number;
  medianeM2: number;
  moyenneM2: number;
  minM2: number;
  maxM2: number;
  /** Combien de comparables sont déjà vendus : ils pèsent plus lourd. */
  nombreVendus: number;
};

export function statistiques(comparables: Comparable[]): Statistiques | null {
  const m2 = comparables.map(m2Retenu).filter((x): x is number => x !== null);
  if (!m2.length) return null;
  return {
    nombre: m2.length,
    medianeM2: mediane(m2) as number,
    moyenneM2: m2.reduce((a, b) => a + b, 0) / m2.length,
    minM2: Math.min(...m2),
    maxM2: Math.max(...m2),
    nombreVendus: comparables.filter((c) => c.statut === 'VENDU' || c.prixVente).length,
  };
}

export type Positionnement = {
  prixM2Bien: number;
  stats: Statistiques;
  /** Écart au marché comparable, en pourcentage du m² médian. */
  ecartPourcent: number;
  /** Le même écart ramené en euros sur la surface du bien. */
  ecartEuros: number;
  /** Nombre de comparables MOINS chers au m² : ce que l'acquéreur voit d'abord. */
  moinsChers: number;
  /** Prix qui alignerait le bien sur la médiane. */
  prixAligne: number;
};

/**
 * Situe le bien parmi ses concurrents. Renvoie null s'il manque la surface, le
 * prix, ou tout comparable exploitable : mieux vaut ne rien afficher qu'un
 * chiffre bâti sur du vide.
 */
export function positionner(
  bien: { price?: number | null; surface?: number | null },
  comparables: Comparable[],
): Positionnement | null {
  const prixM2Bien = prixM2(bien.price, bien.surface);
  const stats = statistiques(comparables);
  if (prixM2Bien === null || !stats) return null;

  const surface = Number(bien.surface);
  const prixAligne = stats.medianeM2 * surface;
  return {
    prixM2Bien,
    stats,
    ecartPourcent: ((prixM2Bien - stats.medianeM2) / stats.medianeM2) * 100,
    ecartEuros: Number(bien.price) - prixAligne,
    moinsChers: comparables.filter((c) => {
      const m = m2Retenu(c);
      return m !== null && m < prixM2Bien;
    }).length,
    prixAligne,
  };
}

/**
 * Fourchette conseillée : du premier quartile des comparables à leur médiane.
 *
 * Viser la médiane suffit à revenir dans le marché ; viser le premier quartile
 * fait passer le bien devant la moitié de ses concurrents, ce qui est le but
 * quand le vendeur est pressé. Deux bornes valent mieux qu'un chiffre unique,
 * qui se discute point par point.
 */
export function fourchetteConseillee(
  bien: { surface?: number | null },
  comparables: Comparable[],
): { bas: number; haut: number } | null {
  const m2 = comparables.map(m2Retenu).filter((x): x is number => x !== null).sort((a, b) => a - b);
  const surface = Number(bien.surface);
  if (!m2.length || !Number.isFinite(surface) || surface <= 0) return null;
  const med = mediane(m2) as number;
  const q1 = mediane(m2.slice(0, Math.ceil(m2.length / 2))) as number;
  return { bas: q1 * surface, haut: med * surface };
}

/**
 * Ce que la baisse coûte VRAIMENT au vendeur : le net vendeur, pas le prix
 * affiché. C'est la seule ligne qui l'intéresse, et elle baisse moins vite que
 * le prix FAI quand les honoraires sont à sa charge.
 */
export function impactNetVendeur(
  bien: { price?: number | null; netSellerAmount?: number | null },
  nouveauPrix: number,
): { netActuel: number; netNouveau: number; perte: number; honoraires: number } | null {
  const prix = Number(bien.price);
  if (!Number.isFinite(prix) || prix <= 0 || !Number.isFinite(nouveauPrix)) return null;
  const netActuel = Number.isFinite(Number(bien.netSellerAmount)) && Number(bien.netSellerAmount) > 0
    ? Number(bien.netSellerAmount)
    : prix;
  const honoraires = Math.max(0, prix - netActuel);
  const netNouveau = Math.max(0, nouveauPrix - honoraires);
  return { netActuel, netNouveau, perte: netActuel - netNouveau, honoraires };
}

/**
 * Un effectif trop faible rend la médiane fragile. La page le dit plutôt que
 * de présenter trois biens comme « le marché ».
 */
export function fiabilite(stats: Statistiques | null): 'faible' | 'moyenne' | 'bonne' | null {
  if (!stats) return null;
  if (stats.nombre < 3) return 'faible';
  if (stats.nombre < 6) return 'moyenne';
  return 'bonne';
}

/**
 * Sélectionne, dans le portefeuille, les biens qui tiennent lieu de
 * concurrents : même type, même ville, surface dans une bande de +/- 30 %.
 * Le bien lui-même est evidemment exclu.
 */
export function comparablesDuPortefeuille(
  bien: { id?: string; type?: string; city?: string; surface?: number | null },
  tous: any[],
  tolerance = 0.3,
): Comparable[] {
  const surface = Number(bien.surface) || 0;
  const norme = (v: unknown) => String(v ?? '').trim().toLowerCase();
  return (tous || [])
    .filter((p) => p && p.id !== bien.id)
    .filter((p) => norme(p.type) === norme(bien.type) && norme(p.city) === norme(bien.city))
    .filter((p) => {
      if (!surface) return true;
      const s = Number(p.surface) || 0;
      return s > 0 && Math.abs(s - surface) / surface <= tolerance;
    })
    .map((p) => ({
      id: String(p.id),
      titre: String(p.title || 'Sans titre'),
      ville: p.city,
      prix: Number(p.price) || 0,
      surface: Number(p.surface) || 0,
      prixVente: Number(p.finalSalePrice) || undefined,
      statut: (p.status === 'SOLD' || p.sold ? 'VENDU' : 'EN_VENTE') as StatutComparable,
      source: 'Portefeuille',
    }))
    .filter((c) => c.prix > 0 && c.surface > 0);
}

/**
 * Depuis combien de temps une annonce est-elle en ligne ? Rendu en clair.
 *
 * On dit « depuis 5 mois » plutôt que « 12/04/2026 » : une date brute oblige
 * le lecteur à compter, et c'est précisément ce comptage qui porte l'argument.
 */
export function ancienneteAnnonce(dateParution?: string, maintenant = new Date()): string | null {
  if (!dateParution) return null;
  const d = new Date(dateParution);
  if (Number.isNaN(d.getTime())) return null;
  const jours = Math.floor((maintenant.getTime() - d.getTime()) / 86400000);
  if (jours < 0) return null;
  if (jours < 14) return `${jours} j`;
  if (jours < 60) return `${Math.round(jours / 7)} sem.`;
  const mois = Math.round(jours / 30.44);
  if (mois < 24) return `${mois} mois`;
  return `${Math.floor(mois / 12)} ans`;
}

