/**
 * Moteur d'estimation : partir d'un prix au m² de secteur et le corriger.
 *
 * CE MODULE NE CONTIENT AUCUN CHIFFRE DE MARCHÉ. Les coefficients vivent dans
 * lib/baremeEstimation.ts, daté et sourcé, parce qu'ils se périment : les
 * Notaires republient la valeur verte chaque année, et une décote DPE de 2023
 * n'a plus cours après les interdictions de location. Séparer le calcul du
 * barème permet de mettre à jour l'un sans retoucher l'autre.
 *
 * LE POINT LE PLUS IMPORTANT DE TOUT LE FICHIER. Les coefficients sont des
 * écarts à un bien MÉDIAN, pas à un bien parfait. Le prix au m² de départ vient
 * de ventes réelles du secteur : ces ventes contiennent déjà leur part de
 * troisièmes étages, de DPE D et d'appartements corrects. Appliquer « +8 %
 * parce que le bien est rénové » revient donc à dire « mieux que le bien
 * moyen du secteur », pas « mieux qu'une ruine ». Chaque échelle porte pour
 * cette raison un point neutre explicite, et c'est lui qui s'affiche dans le
 * document remis au vendeur.
 *
 * COMPOSITION MULTIPLICATIVE. Additionner -11 %, -8 % et -5 % pour annoncer
 * -24 % est faux, et surtout non borné : six critères défavorables
 * donneraient -60 %, un chiffre qu'aucune vente ne valide. On compose donc
 * les facteurs, et on plafonne le cumul — un bien ne se décote pas
 * indéfiniment, il se vend simplement moins vite.
 */

import { BAREME_COURANT } from './baremeEstimation.ts';
export { BAREME_COURANT };

export type Critere = 'dpe' | 'etat' | 'etage' | 'ascenseur' | 'bruit' | 'ensoleillement';

export const CRITERES: Critere[] = ['dpe', 'etat', 'etage', 'ascenseur', 'bruit', 'ensoleillement'];

export type TypeBien = 'Appartement' | 'Maison';

/** Ce que vaut une modalité : un chiffre, ou un chiffre par type de bien. */
export type Pourcent = number | { Appartement: number; Maison: number };

export type Fiabilite = 'mesuree' | 'estimee' | 'usage';

export type Modalite = {
  cle: string;
  libelle: string;
  /** Écart au point neutre de l'échelle, en pourcentage. */
  pourcent: Pourcent;
  /** D'où vient ce chiffre. S'affiche dans le document : il doit être vérifiable. */
  source: string;
  /**
   * `mesuree` : issue d'une étude statistique sur des transactions réelles.
   * `estimee` : ordre de grandeur convergent, sans étude publiée.
   * `usage` : pratique de la profession, à ajuster selon le secteur.
   */
  fiabilite: Fiabilite;
  note?: string;
};

export type Echelle = {
  libelle: string;
  /** Ce à quoi 0 % se rapporte, écrit pour être lu par le vendeur. */
  neutre: string;
  explication: string;
  /** Certains critères n'ont de sens que pour un type de bien. */
  seulementPour?: TypeBien;
  modalites: Modalite[];
};

export type Bareme = {
  version: string;
  /** Date de la dernière révision des coefficients. */
  revuLe: string;
  /** Plafond de l'ajustement cumulé, en valeur absolue et en pourcentage. */
  plafond: number;
  criteres: Record<Critere, Echelle>;
};

/** Le choix de l'agent : une clé de modalité par critère renseigné. */
export type Choix = Partial<Record<Critere, string>>;

/**
 * Corrections manuelles, par critère, en pourcentage.
 *
 * Le barème est national ; l'agent connaît sa rue. Un rez-de-chaussée sur
 * jardin clos ne se décote pas comme un rez-de-chaussée sur boulevard, et
 * personne à Paris ne peut le savoir depuis une moyenne nationale.
 */
export type Corrections = Partial<Record<Critere, number>>;

export type Ajustement = {
  critere: Critere;
  /** Nom du critère, pour l'en-tête de ligne. */
  libelle: string;
  /** Clé de la modalité retenue — c'est elle qui se teste, jamais le libellé. */
  cle: string;
  /** Modalité retenue, en clair. */
  modalite: string;
  pourcent: number;
  source: string;
  fiabilite: Fiabilite;
  /** Vrai si l'agent a remplacé la valeur du barème. */
  corrige: boolean;
  /** Valeur d'origine, quand elle a été corrigée. */
  pourcentBareme?: number;
  note?: string;
};

/** Résout un pourcentage qui peut dépendre du type de bien. */
export function pourcentDe(p: Pourcent, type: TypeBien): number {
  return typeof p === 'number' ? p : p[type];
}

/** Les modalités proposables pour un critère, compte tenu du type de bien. */
export function modalitesDe(bareme: Bareme, critere: Critere, type: TypeBien): Modalite[] {
  const e = bareme.criteres[critere];
  if (!e || (e.seulementPour && e.seulementPour !== type)) return [];
  return e.modalites;
}

/** Les critères applicables à un type de bien — un étage n'existe pas pour une maison. */
export function criteresDe(bareme: Bareme, type: TypeBien): Critere[] {
  return CRITERES.filter((c) => {
    const e = bareme.criteres[c];
    return e && (!e.seulementPour || e.seulementPour === type);
  });
}

/**
 * Traduit les choix de l'agent en lignes d'ajustement.
 *
 * Un critère non renseigné ne produit RIEN — pas une ligne à 0 %. Le document
 * doit distinguer « j'ai regardé, c'est neutre » de « je n'ai pas regardé » :
 * la seconde est une lacune, et la présenter comme un constat serait mentir
 * par mise en page.
 */
export function ajustementsDe(
  bareme: Bareme,
  choix: Choix,
  type: TypeBien,
  corrections: Corrections = {},
): Ajustement[] {
  const lignes: Ajustement[] = [];
  for (const critere of criteresDe(bareme, type)) {
    const cle = choix[critere];
    if (!cle) continue;
    const echelle = bareme.criteres[critere];
    const modalite = echelle.modalites.find((m) => m.cle === cle);
    if (!modalite) continue;

    const duBareme = pourcentDe(modalite.pourcent, type);
    const correction = corrections[critere];
    const corrige = Number.isFinite(correction as number) && correction !== duBareme;

    lignes.push({
      critere,
      libelle: echelle.libelle,
      cle: modalite.cle,
      modalite: modalite.libelle,
      pourcent: corrige ? (correction as number) : duBareme,
      source: corrige ? "Ajusté par l'agent" : modalite.source,
      fiabilite: corrige ? 'usage' : modalite.fiabilite,
      corrige,
      pourcentBareme: corrige ? duBareme : undefined,
      note: modalite.note,
    });
  }
  return lignes;
}

export type Composition = {
  /** Facteur multiplicatif à appliquer au prix au m² de départ. */
  facteur: number;
  /** Le même écart en pourcentage, après plafonnement. */
  pourcent: number;
  /** L'écart avant plafonnement, pour pouvoir le dire. */
  pourcentBrut: number;
  plafonne: boolean;
};

/**
 * Compose les ajustements. Multiplicatif, puis plafonné.
 *
 * Le plafond n'est pas une coquetterie : sans lui, un bien en G, à rénover,
 * au cinquième sans ascenseur, bruyant et sombre sortirait à -55 %. Ce chiffre
 * ne correspond à rien d'observable — un tel bien se vend décoté, mais il se
 * vend, et l'acquéreur qui l'achète ne cumule pas six fois sa remise. Au-delà
 * du plafond, ce n'est plus le prix qui absorbe le défaut, c'est le délai.
 */
export function composer(ajustements: Ajustement[], plafond: number): Composition {
  const facteurBrut = ajustements.reduce((f, a) => f * (1 + a.pourcent / 100), 1);
  const pourcentBrut = (facteurBrut - 1) * 100;
  const limite = Math.abs(plafond);
  const plafonne = Math.abs(pourcentBrut) > limite;
  const pourcent = plafonne ? Math.sign(pourcentBrut) * limite : pourcentBrut;
  return { facteur: 1 + pourcent / 100, pourcent, pourcentBrut, plafonne };
}

export type Entree = {
  /** Prix au m² du secteur, avant correction. */
  baseM2: number;
  surface: number;
  type: TypeBien;
  choix: Choix;
  corrections?: Corrections;
  /** Barème à appliquer. Par défaut celui en vigueur ; injectable pour les tests. */
  bareme?: Bareme;
};

export type Resultat = {
  baseM2: number;
  /** Prix au m² après ajustements. */
  m2Ajuste: number;
  /** Valeur centrale. */
  valeur: number;
  /** Fourchette de présentation, autour de la valeur centrale. */
  bas: number;
  haut: number;
  ajustements: Ajustement[];
  composition: Composition;
  /** Ce que la valeur vaudrait sans aucune correction. */
  valeurBrute: number;
};

/**
 * Demi-largeur de la fourchette présentée, en pourcentage de la valeur.
 *
 * Une estimation annoncée au millier près est une estimation à laquelle
 * personne ne croit, et surtout qu'on ne peut pas défendre : l'écart-type des
 * ventes comparables d'un même secteur dépasse largement 5 %. On présente donc
 * une fourchette, et c'est elle qui engage.
 */
export const DEMI_FOURCHETTE = 0.05;

export function estimer(e: Entree): Resultat | null {
  const baseM2 = Number(e.baseM2);
  const surface = Number(e.surface);
  if (!Number.isFinite(baseM2) || baseM2 <= 0) return null;
  if (!Number.isFinite(surface) || surface <= 0) return null;

  const bareme = e.bareme ?? BAREME_COURANT;
  const ajustements = ajustementsDe(bareme, e.choix, e.type, e.corrections);
  const composition = composer(ajustements, bareme.plafond);
  const m2Ajuste = baseM2 * composition.facteur;
  const valeur = m2Ajuste * surface;

  return {
    baseM2,
    m2Ajuste,
    valeur,
    bas: valeur * (1 - DEMI_FOURCHETTE),
    haut: valeur * (1 + DEMI_FOURCHETTE),
    ajustements,
    composition,
    valeurBrute: baseM2 * surface,
  };
}

/**
 * Sur quoi asseoir le prix au m² de départ.
 *
 * Les trois sources ne se valent pas, et l'ordre est celui de la solidité :
 * une vente signée est un fait, une annonce est une demande, un indice de site
 * est une moyenne de quartier. La page laisse choisir, mais elle dit laquelle
 * elle recommande.
 */
export type SourceBase = 'DVF' | 'COMPARABLES' | 'REFERENCE' | 'MANUELLE';

export const LIBELLE_SOURCE: Record<SourceBase, string> = {
  DVF: 'Ventes signées (DVF)',
  COMPARABLES: 'Biens comparables relevés',
  REFERENCE: 'Indice de secteur',
  MANUELLE: 'Saisie manuelle',
};

export type Alerte = {
  criteres: Critere[];
  texte: string;
};

/**
 * Les cumuls qui comptent deux fois le même défaut.
 *
 * Ce ne sont pas des scrupules de méthode : ce sont trois recoupements
 * documentés, et chacun gonfle la correction dans le même sens, donc l'erreur
 * ne se compense pas. Le pire est le premier — DINAMIC a montré que l'effet
 * DPE mesuré sur les appartements « peut inclure un effet de l'état du bien »,
 * si bien qu'appliquer les deux revient à décoter deux fois la même vétusté.
 *
 * On alerte, on ne corrige pas d'office : l'agent seul sait si le bien est en
 * G parce qu'il est vétuste, ou en G malgré des finitions récentes.
 */
export function alertes(ajustements: Ajustement[]): Alerte[] {
  const pris = new Map(ajustements.map((a) => [a.critere, a]));
  const dit = (c: Critere, ...cles: string[]) => {
    const a = pris.get(c);
    return a ? cles.includes(a.cle) : false;
  };

  const sorties: Alerte[] = [];

  if (dit('dpe', 'F', 'G') && dit('etat', 'A_RENOVER', 'TRAVAUX')) {
    sorties.push({
      criteres: ['dpe', 'etat'],
      texte:
        "Étiquette dégradée ET travaux : les deux décotes se recouvrent en partie. " +
        "Les bases notariales ne séparent pas bien l'énergie de la vétusté, et l'écart " +
        "mesuré sur le DPE contient déjà une part d'état du bien. Envisagez de réduire " +
        "l'une des deux plutôt que de les additionner.",
    });
  }

  if (dit('etage', 'RDC') && dit('ensoleillement', 'PEU_LUMINEUX', 'SOMBRE')) {
    sorties.push({
      criteres: ['etage', 'ensoleillement'],
      texte:
        "Rez-de-chaussée ET manque de lumière : la décote de rez-de-chaussée mesurée " +
        "contient déjà, en moyenne, le vis-à-vis et l'obscurité. Ne conservez la seconde " +
        "correction que si le bien est nettement plus sombre qu'un rez-de-chaussée ordinaire.",
    });
  }

  if (dit('etage', 'DERNIER_ASC') && dit('ensoleillement', 'EXCEPTIONNEL', 'LUMINEUX')) {
    sorties.push({
      criteres: ['etage', 'ensoleillement'],
      texte:
        "Dernier étage ET vue ou luminosité remarquable : la surcote du dernier étage " +
        "capte déjà une part inconnue de la vue et de la lumière. Le cumul surestime " +
        "probablement le bien.",
    });
  }

  return sorties;
}

/**
 * Traduit ce qu'un vendeur a saisi sur le formulaire public en critères du barème.
 *
 * Le formulaire d'estimation en ligne (components/EstimationForm.tsx) demande
 * déjà l'état, le DPE, l'étage, l'ascenseur, la luminosité et le calme — dans
 * son propre vocabulaire. Sans cette traduction, l'agent qui ouvre l'estimation
 * d'un lead retrouve une fiche vide et retape une trentaine de champs devant le
 * client, avec le risque de faute de frappe sur la surface, laquelle divise
 * TOUS les prix au m² du document.
 *
 * Ce qui n'est pas reconnu n'est pas deviné : un critère absent vaut mieux
 * qu'un critère faux, car l'agent relit ce qui est rempli et ne relit pas ce
 * qui est vide.
 */
export function criteresDepuisFormulaire(p: any): Choix {
  const choix: Choix = {};
  if (!p || typeof p !== 'object') return choix;

  const etat: Record<string, string> = {
    'à rénover': 'A_RENOVER',
    'à rafraîchir': 'TRAVAUX',
    'bon état': 'CORRECT',
    'refait à neuf': 'RENOVE',
  };
  const cleEtat = etat[String(p.condition ?? '').trim().toLowerCase()];
  if (cleEtat) choix.etat = cleEtat;

  const dpe = String(p.dpe ?? '').trim().toUpperCase();
  if (/^[A-G]$/.test(dpe)) choix.dpe = dpe;

  if (String(p.type) === 'Appartement') {
    // `floor` peut valoir 0 : c'est un rez-de-chaussée, pas une absence.
    const etage = p.floor === '' || p.floor == null ? null : Number(p.floor);
    const ascenseur = p.elevator === true;
    if (etage !== null && Number.isFinite(etage)) {
      choix.etage =
        etage <= 0 ? 'RDC'
        : etage === 1 ? 'PREMIER'
        : etage <= 3 ? 'COURANT'
        : 'HAUT';
      choix.ascenseur =
        ascenseur || etage <= 0 ? 'AVEC'
        : etage <= 2 ? 'SANS_BAS'
        : etage <= 4 ? 'SANS_MOYEN'
        : 'SANS_HAUT';
    }
  }

  // Le vendeur ne coche que ce qui l'avantage : une case décochée ne veut pas
  // dire « sombre » ou « bruyant », elle ne veut rien dire. On ne décote donc pas.
  if (p.lumineux === true) choix.ensoleillement = 'LUMINEUX';
  if (p.calme === true) choix.bruit = 'CALME';

  return choix;
}
