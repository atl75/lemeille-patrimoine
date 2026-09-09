/**
 * Lecture d'une annonce concurrente, pour nourrir l'argumentaire de prix.
 *
 * POURQUOI CE MODULE EST PUR. Il ne fait aucun appel réseau : on lui donne du
 * HTML ou du texte, il rend des champs. Toute la difficulté est dans le
 * discernement — distinguer un prix de vente d'une charge mensuelle, une
 * surface habitable d'une surface de terrain — et cette difficulté mérite
 * d'être éprouvée par des tests, sans serveur ni portail en face.
 *
 * POURQUOI PAS DE MODÈLE DE LANGAGE. La tentation est grande de confier
 * l'analyse à un LLM. Deux raisons de s'en passer : la clé Anthropic de
 * production est invalide (401 constaté), une extraction qui en dépendrait
 * serait donc morte en ligne ; et surtout un comparable faux empoisonne
 * silencieusement la médiane montrée au vendeur. Ici on préfère ne rien
 * proposer plutôt qu'une valeur plausible et fausse.
 *
 * CE QUE L'ON N'EXTRAIT JAMAIS : le prix de vente signé. La page en déduit le
 * statut VENDU, et le code le désigne comme l'argument le plus fort du
 * dossier. Il se saisit à la main, en conscience.
 */

import * as cheerio from 'cheerio';

/** Ce qu'une annonce peut livrer. Tout est facultatif : rien n'est garanti. */
export type ChampsAnnonce = {
  titre?: string;
  ville?: string;
  prix?: number;
  surface?: number;
  pieces?: number;
  source?: string;
  lien?: string;
};

/** D'où vient chaque valeur, pour pouvoir la citer à l'utilisateur. */
export type Provenance = Partial<Record<keyof ChampsAnnonce, string>>;

export type Extraction = {
  champs: ChampsAnnonce;
  provenance: Provenance;
};

/* ------------------------------------------------------------------ */
/* Nombres à la française                                              */
/* ------------------------------------------------------------------ */

/**
 * Les espaces que le français glisse dans ses nombres. La fine insécable
 * U+202F est celle que produit toLocaleString('fr-FR') — elle avait déjà
 * cassé la génération des PDF de ce projet, elle ne recommencera pas ici.
 */
const ESPACES = /[ \u00A0\u202F\u2009\u2007\u200A\u2060\t]/g;

/** « 249 900 » → 249900, « 65,5 » → 65.5, « 1.250.000 » → 1250000. */
export function nombreFr(brut: string): number {
  const net = String(brut).replace(ESPACES, '');
  // Un point suivi d'exactement trois chiffres est un séparateur de milliers.
  const sansMille = net.replace(/(\d)\.(?=\d{3}(?!\d))/g, '$1');
  return Number(sansMille.replace(',', '.'));
}

/** Normalise pour comparer sans se soucier des accents ni de la casse. */
const sansAccent = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036F]/g, '').toLowerCase();

/* ------------------------------------------------------------------ */
/* La source, déduite du domaine                                       */
/* ------------------------------------------------------------------ */

const PORTAILS: [RegExp, string][] = [
  [/seloger\./i, 'SeLoger'],
  [/leboncoin\./i, 'LeBonCoin'],
  [/bienici\./i, "Bien'ici"],
  [/pap\.fr/i, 'PAP'],
  [/logic-immo\./i, 'Logic-Immo'],
  [/century21/i, 'Century 21'],
  [/orpi\./i, 'Orpi'],
  [/laforet\./i, 'Laforêt'],
  [/guy-hoquet/i, 'Guy Hoquet'],
  [/figaro/i, 'Figaro Immobilier'],
  [/ouestfrance-immo/i, 'Ouest-France Immo'],
];

/** « https://www.seloger.com/… » → « SeLoger ». Sinon, le domaine nu. */
export function sourceDepuisUrl(url: string): string | undefined {
  let hote: string;
  try {
    hote = new URL(url).hostname;
  } catch {
    return undefined;
  }
  for (const [motif, nom] of PORTAILS) if (motif.test(hote)) return nom;
  return hote.replace(/^www\./, '') || undefined;
}

/**
 * Contexte utile autour d'une valeur, BORNÉ À LA PHRASE.
 *
 * Sans cette borne, « Prix : 249 900 € FAI. Charges 120 €/mois » voit le mot
 * « charges » de la phrase SUIVANTE disqualifier le vrai prix. Une annonce
 * enchaîne les montants ; chacun ne se juge que sur sa propre proposition.
 */
function contexteDe(t: string, index: number, longueur: number) {
  const brutAvant = t.slice(Math.max(0, index - 60), index);
  const brutApres = t.slice(index + longueur, index + longueur + 24);
  const COUPURE = /[.;!?\u2022|\n]/;
  return {
    avant: sansAccent(brutAvant.split(COUPURE).pop() ?? brutAvant),
    apres: sansAccent(brutApres.split(COUPURE)[0] ?? ''),
  };
}

/* ------------------------------------------------------------------ */
/* Prix : le discernement compte plus que la regex                     */
/* ------------------------------------------------------------------ */

/**
 * Ce qui, dans le voisinage d'un montant, le disqualifie comme prix de vente.
 * Une annonce est pleine de montants : charges, taxe foncière, honoraires,
 * prix au m² du quartier. En retenir un au hasard fausse la médiane.
 */
const PRIX_DISQUALIFIANT = [
  'charge', 'taxe', 'fonciere', 'honoraire', 'loyer', 'copropriete',
  'provision', 'mensuel', 'mois', 'par an', 'annuel', 'credit',
  'assurance', 'travaux', 'budget', 'depuis', 'a partir de',
];

/** Ce qui, au contraire, désigne franchement un prix de vente. */
const PRIX_QUALIFIANT = ['prix', 'vendu', 'fai', 'hai', 'honoraires inclus', 'net vendeur'];

/**
 * Retrouve le prix de vente dans un texte libre.
 *
 * Stratégie : lister tous les montants en euros, écarter ceux dont le
 * voisinage les disqualifie, préférer ceux que le voisinage qualifie, et à
 * défaut retenir le plus élevé — un prix de vente domine toujours une charge.
 * Sous 10 000 €, on ne propose rien : c'est une charge, pas un bien.
 */
export function prixDepuisTexte(texte: string): { valeur: number; extrait: string } | null {
  const t = texte.replace(/\s+/g, ' ');
  // Le regard en arrière n'est PAS un ornement. Après NFKC, « m² » devient
  // « m2 », et sans lui « 56.59 m2 735000 € » se lit « 2 735000 € » : le 2 de
  // l'unité se colle au prix, qui passe de 735 000 à 2 735 000 €. Constaté
  // sur un vrai titre d'annonce SeLoger.
  const motif = /(?<![A-Za-zÀ-ÿ\d.,])((?:\d[\d \u00A0\u202F\u2009\u2007\u200A.,]{2,})\d)\s*(?:€|EUR\b|euros?\b)/gi;
  const candidats: { valeur: number; score: number; extrait: string }[] = [];

  for (const m of t.matchAll(motif)) {
    const valeur = nombreFr(m[1]);
    if (!Number.isFinite(valeur) || valeur < 10000 || valeur > 100_000_000) continue;

    // Un montant suivi de « /mois » ou « /m² » n'est jamais un prix de vente.
    const suite = t.slice(m.index + m[0].length, m.index + m[0].length + 12);
    if (/^\s*\/\s*(mois|m²|m2|an)/i.test(suite)) continue;

    const { avant, apres } = contexteDe(t, m.index, m[0].length);
    const qualifie = PRIX_QUALIFIANT.some(x => avant.includes(x) || apres.includes(x));
    // Ce qui précède le montant le disqualifie sans appel : « taxe foncière 1 240 € ».
    if (PRIX_DISQUALIFIANT.some(x => avant.includes(x))) continue;
    // Ce qui suit ne le disqualifie que s'il n'est pas déjà désigné comme prix :
    // « 249 900 € FAI (honoraires inclus) » reste un prix de vente.
    if (!qualifie && PRIX_DISQUALIFIANT.some(x => apres.includes(x))) continue;

    candidats.push({ valeur, score: qualifie ? 1 : 0, extrait: m[0].trim() });
  }

  if (!candidats.length) return null;
  candidats.sort((a, b) => b.score - a.score || b.valeur - a.valeur);
  return { valeur: candidats[0].valeur, extrait: candidats[0].extrait };
}

/* ------------------------------------------------------------------ */
/* Surface : habitable, et rien d'autre                                */
/* ------------------------------------------------------------------ */

/** Un terrain de 400 m² n'est pas une surface habitable. */
const SURFACE_DISQUALIFIANTE = [
  'terrain', 'jardin', 'parcelle', 'balcon', 'terrasse', 'cave', 'garage',
  'cellier', 'grenier', 'combles', 'box', 'parking', 'local', 'quartier',
];

const SURFACE_QUALIFIANTE = ['habitable', 'carrez', 'surface', 'appartement', 'maison'];

export function surfaceDepuisTexte(texte: string): { valeur: number; extrait: string } | null {
  const t = texte.replace(/\s+/g, ' ');
  const motif = /(?<![A-Za-zÀ-ÿ\d.,])(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:m²|m2|m\s?carr[ée]s?)(?![\w²])/gi;
  const candidats: { valeur: number; score: number; extrait: string }[] = [];

  for (const m of t.matchAll(motif)) {
    const valeur = nombreFr(m[1]);
    if (!Number.isFinite(valeur) || valeur < 7 || valeur > 2000) continue;

    // « 3 500 €/m² » est un prix au mètre, pas une surface.
    if (/[€]\s*\/\s*$/.test(t.slice(Math.max(0, m.index - 14), m.index))) continue;

    const { avant, apres } = contexteDe(t, m.index, m[0].length);
    const qualifie = SURFACE_QUALIFIANTE.some(x => avant.includes(x));
    // « Surface habitable 72 m², balcon de 9 m² » : c'est ce qui PRÉCÈDE chaque
    // mesure qui dit à quoi elle se rapporte.
    if (SURFACE_DISQUALIFIANTE.some(x => avant.includes(x))) continue;
    if (!qualifie && SURFACE_DISQUALIFIANTE.some(x => apres.includes(x))) continue;

    candidats.push({ valeur, score: qualifie ? 1 : 0, extrait: m[0].trim() });
  }

  if (!candidats.length) return null;
  // À score égal on garde la PLUS GRANDE : la surface habitable domine les
  // pièces qu'on détaille parfois une à une (« séjour de 28 m² »).
  candidats.sort((a, b) => b.score - a.score || b.valeur - a.valeur);
  return { valeur: candidats[0].valeur, extrait: candidats[0].extrait };
}

/* ------------------------------------------------------------------ */
/* Pièces et ville                                                     */
/* ------------------------------------------------------------------ */

export function piecesDepuisTexte(texte: string): number | null {
  const t = sansAccent(texte);
  if (/\bstudio\b/.test(t)) return 1;
  const m = t.match(/\b[tf]\s?(\d{1,2})\b/) || t.match(/(\d{1,2})\s*(?:pieces?|p\.)\b/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 20 ? n : null;
}

/**
 * « Rouen (76000) » ou « 76000 Rouen » — le code postal ancre la ville.
 *
 * Le nom s'arrête aux traits d'union, jamais aux espaces : les communes
 * composées le sont presque toutes ainsi (Mont-Saint-Aignan), les seules
 * exceptions étant les articles (Le Havre). Sans cette borne, « 76000 Rouen
 * Prix : 249 900 € » donnait la ville « Rouen Prix ».
 */
const NOM_COMMUNE = "(?:L['\u2019]|Le |La |Les )?[A-Z\u00C0-\u00DC][\\wÀ-ÿ]*(?:-[A-Za-zÀ-ÿ\u2019']+)*";

export function villeDepuisTexte(texte: string): string | null {
  const t = texte.replace(/\s+/g, ' ');
  const apres = t.match(new RegExp(`\\b\\d{5}\\s+(${NOM_COMMUNE})`));
  if (apres) return apres[1].trim();
  const avant = t.match(new RegExp(`(${NOM_COMMUNE})\\s*\\(\\s*\\d{5}\\s*\\)`));
  if (avant) return avant[1].trim();
  return null;
}

/* ------------------------------------------------------------------ */
/* Texte collé — le chemin principal                                   */
/* ------------------------------------------------------------------ */

/**
 * Analyse le texte d'une annonce copié depuis le navigateur.
 *
 * C'est le chemin PRINCIPAL, pas un repli : les grands portails refusent les
 * requêtes venant d'un serveur (mesuré : SeLoger rend une page vide depuis un
 * centre de données, LeBonCoin et PAP répondent 403 même depuis une IP
 * résidentielle). Le copier-coller, lui, réussit partout et ne dépend
 * d'aucune refonte de site.
 */
export function extraireDepuisTexte(brut: string): Extraction {
  // NFKC d'abord : une seule ligne qui écrase U+00A0, U+202F, U+2009, U+2007,
  // U+205F et U+3000 en espace simple, ET convertit « m² » comme « ㎡ » en
  // « m2 ». Plus large qu'une liste de points de code écrite à la main, qui
  // oublie toujours une variante.
  const texte = brut.normalize('NFKC');
  const champs: ChampsAnnonce = {};
  const provenance: Provenance = {};

  const prix = prixDepuisTexte(texte);
  if (prix) { champs.prix = prix.valeur; provenance.prix = prix.extrait; }

  const surface = surfaceDepuisTexte(texte);
  if (surface) { champs.surface = surface.valeur; provenance.surface = surface.extrait; }

  const pieces = piecesDepuisTexte(texte);
  if (pieces) { champs.pieces = pieces; provenance.pieces = `${pieces} pièces`; }

  const ville = villeDepuisTexte(texte);
  if (ville) { champs.ville = ville; provenance.ville = ville; }

  const titre = titreDeduit(texte, champs);
  if (titre) { champs.titre = titre; provenance.titre = 'déduit du texte'; }

  return { champs, provenance };
}

/**
 * Un intitulé court et factuel. On ne recopie JAMAIS le descriptif de
 * l'annonce : d'abord parce qu'un tableau se lit en diagonale, ensuite parce
 * que reproduire le texte d'un tiers dans un document remis à un client n'a
 * pas à se faire.
 */
function titreDeduit(texte: string, champs: ChampsAnnonce): string | undefined {
  const t = sansAccent(texte);
  const nature = /\bmaison\b/.test(t) ? 'Maison'
    : /\bappartement\b|\bstudio\b|\bt\s?\d\b|\bf\s?\d\b/.test(t) ? 'Appartement'
    : /\bterrain\b/.test(t) ? 'Terrain'
    : /\bimmeuble\b/.test(t) ? 'Immeuble'
    : undefined;
  if (!nature) return undefined;

  const bouts = [nature];
  if (champs.pieces) bouts.push(champs.pieces === 1 ? 'studio' : `${champs.pieces} pièces`);
  if (champs.surface) bouts.push(`${String(champs.surface).replace('.', ',')} m²`);
  if (champs.ville) bouts.push(`— ${champs.ville}`);
  return bouts.join(' ');
}

/**
 * Deux lectures d'un même bien, la première faisant autorité.
 *
 * Sert aux impressions PDF : le titre du document est normalisé par le
 * portail — « Appartement à vendre T3-F3 56.59 m² 735000 € Montmartre Paris
 * (75018) » — alors que le corps d'une impression de quinze pages mélange la
 * fiche et les « biens similaires », dont les prix fausseraient tout. Le titre
 * dicte donc, le corps ne fait que combler.
 */
export function fusionner(prioritaire: Extraction, secours: Extraction): Extraction {
  const champs: ChampsAnnonce = { ...secours.champs };
  const provenance: Provenance = { ...secours.provenance };
  for (const cle of Object.keys(prioritaire.champs) as (keyof ChampsAnnonce)[]) {
    const v = prioritaire.champs[cle];
    if (v == null || v === '') continue;
    (champs as any)[cle] = v;
    provenance[cle] = prioritaire.provenance[cle] ?? provenance[cle];
  }
  return { champs, provenance };
}

/* ------------------------------------------------------------------ */
/* Prix de référence au m² — MeilleursAgents et consorts               */
/* ------------------------------------------------------------------ */

export type ReferenceM2 = {
  /** Prix au m² retenu. */
  m2: number;
  /** Bas et haut de fourchette, quand la page en donne une. */
  bas?: number;
  haut?: number;
  source?: string;
  extrait: string;
};

/**
 * Lit un prix de référence au mètre carré dans une page collée ou imprimée.
 *
 * POURQUOI PAS AUTOMATIQUE. MeilleursAgents répond 403 avec un en-tête
 * « x-datadome: protected », y compris depuis une adresse résidentielle —
 * mesuré. Comme pour SeLoger, on ne contourne pas : l'agent ouvre la page dans
 * son navigateur, où il est légitimement connecté, et colle ou dépose son
 * impression. La donnée vient donc de lui, pas d'un robot.
 *
 * LA DIFFICULTÉ EST DE CHOISIR. Une telle page aligne des dizaines de
 * montants : honoraires, évolution en pourcentage, biens en vitrine, charges.
 * On cherche donc d'abord une FOURCHETTE EXPLICITE — « de X à Y », « entre X
 * et Y », « basse / haute », « min / max » — parce qu'une fourchette annoncée
 * lève l'ambiguïté à elle seule. À défaut, on retombe sur le montant le mieux
 * désigné par son voisinage.
 */
export function extraireReferenceM2(brut: string): ReferenceM2 | null {
  const t = brut.normalize('NFKC').replace(/\s+/g, ' ');

  /** Un prix au m² plausible en France. */
  const plausible = (v: number) => Number.isFinite(v) && v >= 300 && v <= 40000;
  const UNITE = String.raw`(?:€|EUR)\s*\/\s*(?:m²|m2)`;
  const NOMBRE = String.raw`\d[\d .,\u00A0\u202F]{1,9}\d`;

  // 1. Une fourchette annoncée : « de 8 900 à 12 400 €/m² », « entre X et Y ».
  const fourchettes = [
    new RegExp(String.raw`(?:de|entre)\s+(${NOMBRE})\s*(?:${UNITE})?\s*(?:à|a|et|-|–)\s*(${NOMBRE})\s*${UNITE}`, 'i'),
    new RegExp(String.raw`(${NOMBRE})\s*${UNITE}\s*(?:à|a|et|-|–)\s*(${NOMBRE})\s*${UNITE}`, 'i'),
  ];
  let bas: number | undefined, haut: number | undefined;
  for (const motif of fourchettes) {
    const m = t.match(motif);
    if (!m) continue;
    const a = nombreFr(m[1]), b = nombreFr(m[2]);
    if (plausible(a) && plausible(b) && a !== b) { bas = Math.min(a, b); haut = Math.max(a, b); break; }
  }

  // 2. Bas et haut nommés séparément, si la page les présente ainsi.
  if (bas == null) {
    const nomme = (mots: string) => {
      const m = t.match(new RegExp(String.raw`(?:${mots})[^\d]{0,24}(${NOMBRE})\s*${UNITE}`, 'i'));
      const v = m ? nombreFr(m[1]) : NaN;
      return plausible(v) ? v : undefined;
    };
    const b = nomme('fourchette basse|estimation basse|prix bas|minimum|mini\\b|min\\b');
    const h = nomme('fourchette haute|estimation haute|prix haut|maximum|maxi\\b|max\\b');
    if (b != null && h != null && b !== h) { bas = Math.min(b, h); haut = Math.max(b, h); }
  }

  // 3. Le prix central : celui que son voisinage désigne le mieux.
  const central = new RegExp(String.raw`(?<![A-Za-zÀ-ÿ\d.,])(${NOMBRE})\s*${UNITE}`, 'gi');
  const candidats: { valeur: number; score: number; extrait: string; index: number }[] = [];
  for (const m of t.matchAll(central)) {
    const valeur = nombreFr(m[1]);
    if (!plausible(valeur)) continue;
    const avant = sansAccent(t.slice(Math.max(0, m.index - 70), m.index));
    // Ce qui désigne franchement le prix du secteur, et ce qui l'exclut.
    if (/(charge|honoraire|taxe|travaux|loyer)/.test(avant)) continue;
    const score =
      /(prix\s*(?:m2|au\s*m2|moyen)|prix moyen|estimation|prix de vente)/.test(avant) ? 2 :
      /(median|moyen|quartier|secteur|appartement|maison|rue|adresse)/.test(avant) ? 1 : 0;
    candidats.push({ valeur, score, extrait: m[0].trim(), index: m.index });
  }
  if (!candidats.length) {
    // Une page peut n'annoncer QUE sa fourchette : le centre s'en déduit.
    if (bas != null && haut != null) {
      return { m2: Math.round((bas + haut) / 2), bas, haut, extrait: `${bas} – ${haut} €/m²` };
    }
    return null;
  }

  // Un candidat qui EST une borne de la fourchette n'est pas le prix central.
  const horsBornes = candidats.filter(c => c.valeur !== bas && c.valeur !== haut);
  // Si la page n'annonce QUE ses bornes, le centre se déduit — en retenir une
  // comme « le prix » afficherait la borne basse en gros caractères.
  if (!horsBornes.length && bas != null && haut != null) {
    return { m2: Math.round((bas + haut) / 2), bas, haut, extrait: `${bas} – ${haut} €/m²` };
  }
  const liste = horsBornes.length ? horsBornes : candidats;
  liste.sort((a, b) => b.score - a.score || a.index - b.index);
  const principal = liste[0];

  // 4. À défaut de fourchette annoncée, deux valeurs proches en tiennent lieu.
  if (bas == null) {
    const proches = candidats
      .map(x => x.valeur)
      .filter(v => v !== principal.valeur && Math.abs(v - principal.valeur) / principal.valeur < 0.4)
      .sort((a, b) => a - b);
    if (proches.length) {
      bas = Math.min(proches[0], principal.valeur);
      haut = Math.max(proches[proches.length - 1], principal.valeur);
    }
  }

  return { m2: principal.valeur, bas, haut, extrait: principal.extrait };
}

/* ------------------------------------------------------------------ */
/* HTML — l'accélérateur, quand le site se laisse lire                 */
/* ------------------------------------------------------------------ */

/** Aplatit @graph et tableaux pour retrouver tous les nœuds schema.org. */
function noeudsJsonLd(html: string, $: cheerio.CheerioAPI): any[] {
  const noeuds: any[] = [];
  const visiter = (n: any) => {
    if (Array.isArray(n)) return n.forEach(visiter);
    if (n && typeof n === 'object') {
      noeuds.push(n);
      if (n['@graph']) visiter(n['@graph']);
    }
  };
  $('script[type="application/ld+json"]').each((_, el) => {
    try { visiter(JSON.parse($(el).contents().text())); } catch { /* balise cassée : on l'ignore */ }
  });
  return noeuds;
}

const typeDe = (n: any) => ([] as string[]).concat(n?.['@type'] || []).join(',');

/**
 * Extrait les champs d'une page d'annonce.
 *
 * Ordre de confiance : JSON-LD schema.org d'abord (c'est du balisage que le
 * site publie exprès, stable et non ambigu), puis Open Graph, et seulement en
 * dernier recours le texte visible — le moins fiable des trois.
 */
export function extraireDepuisHtml(html: string, url?: string): Extraction {
  const $ = cheerio.load(html);
  const champs: ChampsAnnonce = {};
  const provenance: Provenance = {};

  const noeuds = noeudsJsonLd(html, $);
  const bien = noeuds.find(n => /RealEstateListing|Residence|Apartment|House|Accommodation/i.test(typeDe(n)));
  // Un « AggregateOffer » décrit une PAGE DE RÉSULTATS, pas un bien : mesuré
  // chez ParuVendu et sur les listes SeLoger, il annonce lowPrice 900 et
  // highPrice 75 000 000. Le prendre pour un prix déplacerait la médiane de
  // l'argumentaire sans le moindre bruit. On l'écarte, ainsi que tout nœud
  // qui compte plusieurs offres.
  const offreValable = (n: any) => {
    const o = n?.offers;
    const cible = Array.isArray(o) ? o[0] : o;
    if (cible && /AggregateOffer/i.test(typeDe(cible))) return false;
    if (cible && (cible.offerCount != null || cible.lowPrice != null)) return false;
    return (cible?.price ?? n?.price) != null;
  };
  const offre = noeuds.find(offreValable);

  // 1. JSON-LD
  const prixLd = offre?.offers?.price ?? offre?.offers?.[0]?.price ?? offre?.price;
  if (prixLd != null && Number(prixLd) >= 10000) {
    champs.prix = Number(prixLd); provenance.prix = 'balisage schema.org';
  }
  const surfaceLd = bien?.floorSize?.value ?? bien?.floorSize;
  if (Number(surfaceLd) > 0) {
    champs.surface = Number(surfaceLd); provenance.surface = 'balisage schema.org';
  }
  if (Number(bien?.numberOfRooms) > 0) {
    champs.pieces = Number(bien.numberOfRooms); provenance.pieces = 'balisage schema.org';
  }
  const villeLd = bien?.address?.addressLocality;
  if (typeof villeLd === 'string' && villeLd.trim()) {
    champs.ville = villeLd.trim(); provenance.ville = 'balisage schema.org';
  }

  // 2. Open Graph, pour ce qui manque encore
  if (champs.prix == null) {
    const og = $('meta[property="product:price:amount"], meta[property="og:price:amount"]').attr('content');
    if (og && Number(og) >= 10000) { champs.prix = Number(og); provenance.prix = 'balise Open Graph'; }
  }

  // 3. Texte visible, en dernier recours
  // Le pied de page, l'en-tête et la navigation portent l'adresse de L'AGENCE,
  // pas celle du bien. Les garder faisait extraire « 76000 Rouen » d'un
  // mentions-légales pour une annonce parisienne — la ville du concurrent au
  // lieu de celle du bien comparé. On les retire avant de lire le texte.
  $('script, style, noscript, footer, header, nav, aside, [role="contentinfo"], [role="banner"]').remove();
  // cheerio COLLE le texte des blocs voisins : <h1>Maison 120 m²</h1><p>Prix…
  // donne « 120 m²Prix », et la mesure devient illisible. On sépare donc
  // chaque élément avant d'aplatir.
  $('body').find('*').each((_, el) => { $(el).append(' '); });
  const visible = $('body').text().replace(/\s+/g, ' ').trim();
  const parTexte = extraireDepuisTexte(visible);
  for (const cle of ['prix', 'surface', 'pieces', 'ville'] as const) {
    if (champs[cle] == null && parTexte.champs[cle] != null) {
      (champs as any)[cle] = parTexte.champs[cle];
      provenance[cle] = parTexte.provenance[cle] ?? 'texte de la page';
    }
  }

  // Le titre : og:title, puis h1, puis déduction.
  const titreOg = $('meta[property="og:title"]').attr('content')?.trim();
  const h1 = $('h1').first().text().replace(/\s+/g, ' ').trim();
  const titre = (titreOg || h1 || '').slice(0, 120);
  if (titre) { champs.titre = titre; provenance.titre = titreOg ? 'balise Open Graph' : 'titre de la page'; }
  else if (parTexte.champs.titre) { champs.titre = parTexte.champs.titre; provenance.titre = 'déduit du texte'; }

  if (url) {
    champs.lien = url;
    const src = sourceDepuisUrl(url);
    if (src) { champs.source = src; provenance.source = 'domaine du lien'; }
  }

  return { champs, provenance };
}
