// Secteurs géographiques du site : définition unique, partagée par les pages
// secteurs (rendu) et les fiches biens (lien vers le secteur du bien).

export type Sector = {
  title: string;
  subtitle?: string;
  region?: string;
  cities?: string[];
  description?: string;
  highlights?: string[];
  /**
   * Le secteur nommé en complément de lieu : « Vous vendez {locatif} ? ».
   *
   * Vaut « à {titre} » par défaut, ce qui convient à une commune — « à
   * Bihorel ». Il faut le renseigner dès que la préposition seule ne suffit
   * pas : une région se dit « sur la Côte d'Azur », et un nom portant un
   * article se contracte — « au Mesnil-Esnard », où le « Le » du titre
   * disparaît. C'est bien la locution ENTIÈRE qui est stockée, et non la seule
   * préposition : « au » + « Le Mesnil-Esnard » donnerait « au Le ».
   */
  locatif?: string;
  /**
   * Codes postaux rattachés au secteur, EN PLUS des communes.
   * Sert quand une commune s'étend sur deux secteurs et que seul le code
   * postal les sépare : « Rouen » désigne les deux rives.
   */
  postalCodes?: string[];
  /**
   * Codes postaux explicitement écartés, même si la commune correspond.
   * L'exclusion l'emporte sur la commune — c'est ce qui empêche un bien de
   * la rive gauche de remonter sur la page du cœur historique.
   */
  excludePostalCodes?: string[];
};

/**
 * Code postal d'un bien, s'il est connu.
 *
 * Les cartes le portent en clair (champ `postalCode`) ; sur un bien complet
 * il faut l'extraire de l'adresse de la carte. On retient le DERNIER groupe
 * de cinq chiffres : « 154 Rue Louis Blanc 76100 Rouen » donne 76100, et non
 * un éventuel numéro de rue à cinq chiffres.
 */
export function codePostalDe(p: any): string | null {
  if (!p) return null;
  if (typeof p.postalCode === "string" && /^\d{5}$/.test(p.postalCode)) return p.postalCode;
  const source = String(p.map?.query || p.address || "");
  const trouves = source.match(/\b\d{5}\b/g);
  return trouves ? trouves[trouves.length - 1] : null;
}

/** Le secteur en complément de lieu, « à {titre} » par défaut. */
export function locatifDe(s?: Sector): string {
  return s?.locatif || `à ${s?.title ?? ""}`;
}

export const SECTORS: Record<string, Sector> = {
  "paris-rive-gauche": {
    title: "Paris — Rive gauche",
    subtitle: "7e, 6e, 5e — immeubles haussmanniens et hôtels particuliers.",
    region: "PARIS",
    cities: ["Paris 7", "Paris 7e", "75007", "Paris 6", "Paris 6e", "75006", "Paris 5", "Paris 5e", "75005"],
    postalCodes: ["75005", "75006", "75007"],
    description: "La Rive gauche incarne le Paris patrimonial par excellence. Des appartements haussmanniens de Saint-Germain-des-Prés aux hôtels particuliers du 7e, c'est un marché de biens rares, recherché des familles comme des investisseurs en quête de valeur refuge. La liquidité y est forte et la valorisation constante.",
    highlights: ["Immeubles haussmanniens & hôtels particuliers", "Saint-Germain, Invalides, Panthéon, Jardin du Luxembourg", "Valeur patrimoniale et liquidité élevées"],
  },
  "paris-ouest": {
    title: "Paris Ouest",
    subtitle: "16e, Neuilly, Boulogne — appartements familiaux, terrasses.",
    region: "PARIS",
    cities: ["Paris 16", "Paris 16e", "75016", "Neuilly", "Neuilly-sur-Seine", "Boulogne", "Boulogne-Billancourt"],
    // 75116 est l'autre code du 16e arrondissement : l'oublier laissait
    // l'avenue Raymond Poincaré sans secteur, sa ville n'étant que « Paris ».
    postalCodes: ["75016", "75116", "92200", "92100"],
    description: "L'Ouest parisien conjugue prestige résidentiel et qualité de vie familiale. Grands appartements traversants, immeubles de standing, terrasses et proximité du Bois de Boulogne : un secteur prisé pour ses adresses cossues et ses écoles recherchées, du 16e à Neuilly-sur-Seine.",
    highlights: ["Grands appartements familiaux & terrasses", "16e arrondissement, Neuilly, Boulogne-Billancourt", "Cadre résidentiel recherché, écoles réputées"],
  },
  "paris-centre-historique": {
    title: "Paris — Centre historique",
    subtitle: "1er–4e (Louvre, Marais) — patrimonial et pied-à-terre.",
    region: "PARIS",
    cities: ["75001","75002","75003","75004","Louvre","Marais","Paris 1","Paris 2","Paris 3","Paris 4"],
    postalCodes: ["75001", "75002", "75003", "75004"],
    description: "Du Louvre au Marais, le centre historique offre un immobilier de caractère chargé d'histoire : poutres apparentes, pierres de taille, cours pavées. Un secteur idéal pour un pied-à-terre d'exception ou un investissement patrimonial, où la rareté de l'offre soutient durablement les valeurs.",
    highlights: ["Biens de caractère : Marais, Louvre, Île Saint-Louis", "Idéal pied-à-terre et investissement patrimonial", "Offre rare, forte demande locative"],
  },
  "bois-guillaume": {
    title: "Bois-Guillaume",
    subtitle: "Plateau Nord — maisons familiales et terrains arborés.",
    region: "NORMANDIE",
    cities: ["Bois-Guillaume"],
    description: "Bois-Guillaume est l'une des communes les plus recherchées du Plateau Nord de Rouen. Ses maisons familiales, ses terrains arborés et la qualité de ses écoles en font un secteur prisé des familles. Le marché y est tendu : les belles demeures, notamment autour du Village et des Portes de la Forêt, se vendent rapidement. Nous y accompagnons vendeurs et acquéreurs avec une connaissance fine des micro-secteurs et des prix réels de transaction.",
    highlights: ["Maisons familiales avec jardin, terrains arborés", "Écoles réputées, cadre résidentiel calme", "Marché tendu : estimation précise indispensable"],
  },
  "bihorel": {
    title: "Bihorel",
    subtitle: "Aux portes de Rouen — résidentiel prisé et proximité immédiate.",
    region: "NORMANDIE",
    cities: ["Bihorel"],
    description: "Bihorel offre le meilleur compromis entre proximité du centre de Rouen et cadre résidentiel. Ses maisons de ville, ses pavillons des années 30 et ses appartements récents attirent aussi bien les primo-accédants que les familles. La commune bénéficie de commerces de proximité, d'écoles et d'un accès rapide au centre-ville et au CHU.",
    highlights: ["Maisons de ville et pavillons de caractère", "À 5 minutes du centre de Rouen et du CHU", "Bon équilibre prix / qualité de vie"],
  },
  "isneauville": {
    title: "Isneauville",
    subtitle: "Nord de Rouen — constructions récentes et cadre verdoyant.",
    region: "NORMANDIE",
    cities: ["Isneauville"],
    description: "Isneauville s'est imposée comme une commune de choix au nord de Rouen : constructions récentes, lotissements de qualité, écoles et commerces, le tout dans un environnement verdoyant. Sa proximité avec la zone d'activités et l'accès à l'A28 en font un secteur dynamique, particulièrement adapté aux familles souhaitant du neuf ou du récent avec jardin.",
    highlights: ["Maisons récentes avec jardin", "Environnement verdoyant, écoles et commerces", "Accès rapide A28 et pôles d'activité"],
  },
  "rouen-rive-gauche": {
    title: "Rouen Rive Gauche",
    subtitle: "Saint-Sever, Grammont — investissement et rendement locatif.",
    region: "NORMANDIE",
    cities: ["Sotteville-lès-Rouen", "Petit-Quevilly", "Le Petit-Quevilly", "Grand-Quevilly", "Le Grand-Quevilly", "Saint-Étienne-du-Rouvray"],
    // Saint-Sever, Grammont, Jardin des Plantes : la rive gauche de Rouen
    // porte le code 76100 et n'apparaissait sur aucun secteur, la liste des
    // communes ci-dessus ne contenant pas « Rouen ».
    postalCodes: ["76100"],
    description: "La rive gauche de Rouen connaît une transformation profonde avec les projets urbains autour de Saint-Sever et de Grammont. Les prix y restent plus accessibles que sur la rive droite, offrant des rendements locatifs supérieurs, portés par la présence étudiante et la desserte en transports. Un secteur à considérer pour l'investissement locatif comme pour un premier achat.",
    highlights: ["Prix d'entrée accessibles, bons rendements locatifs", "Quartiers en renouvellement urbain (Saint-Sever, Grammont)", "Forte demande locative étudiante et jeunes actifs"],
  },
  "mesnil-esnard-franqueville": {
    title: "Le Mesnil-Esnard & Franqueville-Saint-Pierre",
    locatif: "au Mesnil-Esnard & Franqueville-Saint-Pierre",
    subtitle: "Plateau Est — maisons familiales et vue sur la vallée.",
    region: "NORMANDIE",
    cities: ["Mesnil-Esnard", "Le Mesnil-Esnard", "Franqueville", "Franqueville-Saint-Pierre"],
    description: "Le Mesnil-Esnard et Franqueville-Saint-Pierre forment un secteur résidentiel apprécié du Plateau Est, avec des maisons familiales, des terrains généreux et, pour certaines adresses, une vue dégagée sur la vallée de la Seine. Commerces, écoles et accès rapide à Rouen en font une alternative recherchée au Plateau Nord.",
    highlights: ["Maisons familiales avec terrain", "Vue sur la vallée de la Seine pour certaines adresses", "Alternative au Plateau Nord, à 10 min de Rouen"],
  },
  "rouen-centre": {
    title: "Rouen & cœur historique",
    subtitle: "Quartier des musées, Préfecture, Saint-Maclou.",
    region: "NORMANDIE",
    cities: ["Rouen"],
    // 76100, c'est la rive gauche : ces biens relèvent de « Rouen Rive
    // Gauche », pas du cœur historique, bien que leur ville soit « Rouen ».
    excludePostalCodes: ["76100"],
    description: "Rouen séduit par son centre médiéval, ses maisons à colombages et son riche patrimoine classé. Le quartier des Musées, la Préfecture et Saint-Maclou offrent des appartements de caractère et des immeubles éligibles à la défiscalisation (Malraux, Monument Historique), à des niveaux de prix attractifs face à Paris.",
    highlights: ["Appartements de caractère au cœur historique", "Fort potentiel de défiscalisation (Malraux, MH)", "Marché dynamique, rendement locatif intéressant"],
  },
  "mont-saint-aignan-bois-guillaume": {
    title: "Mont-Saint-Aignan & Bois-Guillaume",
    subtitle: "Résidentiel recherché, maisons & appartements avec vues.",
    region: "NORMANDIE",
    cities: ["Mont-Saint-Aignan","Bois-Guillaume"],
    description: "Sur les hauteurs de Rouen, Mont-Saint-Aignan et Bois-Guillaume forment le secteur résidentiel le plus recherché de la métropole : maisons familiales, terrains arborés, vues dégagées et proximité des meilleures écoles. Un marché stable, porté par une demande familiale constante.",
    highlights: ["Maisons familiales & terrains arborés", "Environnement résidentiel prisé, écoles réputées", "Valeurs stables et demande soutenue"],
  },
  "saint-aygulf-frejus": {
    title: "Saint-Aygulf & Fréjus",
    subtitle: "Maisons de vacances, marinas, proximité des calanques.",
    region: "COTE_D_AZUR",
    cities: ["Saint-Aygulf","Fréjus","Frejus"],
    description: "Entre plages, marinas et calanques du massif de l'Estérel, Saint-Aygulf et Fréjus offrent un art de vivre méditerranéen prisé pour la résidence secondaire comme pour l'investissement locatif saisonnier. Villas les pieds dans l'eau, appartements vue mer et maisons de vacances y côtoient un patrimoine romain remarquable.",
    highlights: ["Villas & appartements vue mer, proximité plages", "Fort potentiel locatif saisonnier", "Cadre méditerranéen, marinas et Estérel"],
  },
  "sainte-maxime-golfe-saint-tropez": {
    title: "Sainte-Maxime / Golfe de Saint-Tropez",
    subtitle: "Villas et résidences de standing.",
    region: "COTE_D_AZUR",
    cities: ["Sainte-Maxime","Saint-Tropez","Grimaud","Cogolin","Gassin","La Croix-Valmer"],
    description: "Le Golfe de Saint-Tropez est l'une des adresses les plus convoitées de la Côte d'Azur. De Sainte-Maxime aux villages perchés de Gassin et Grimaud, on y trouve des villas de standing, des domaines avec vue mer et des résidences d'exception, portés par une clientèle internationale et une valeur refuge reconnue.",
    highlights: ["Villas de standing & domaines vue mer", "Sainte-Maxime, Grimaud, Gassin, Saint-Tropez", "Clientèle internationale, valeur refuge"],
  },
  "esterel-arriere-pays": {
    title: "Estérel & arrière-pays",
    subtitle: "Agay, Théoule-sur-Mer — vues mer, environnement préservé.",
    region: "COTE_D_AZUR",
    cities: ["Agay","Théoule-sur-Mer","Theoule","Mandelieu","Les Adrets","Adrets de l'Estérel"],
    description: "Le massif de l'Estérel et son arrière-pays offrent un cadre naturel préservé, entre roches rouges et Méditerranée. D'Agay à Théoule-sur-Mer, ce secteur confidentiel séduit les amateurs de nature et d'intimité : villas panoramiques, propriétés au calme et vues mer spectaculaires, à l'écart de l'agitation.",
    highlights: ["Villas panoramiques & propriétés au calme", "Agay, Théoule-sur-Mer, Mandelieu, Les Adrets", "Nature préservée, intimité et vues mer"],
  },

  // Secteur d'ensemble pour l'Île-de-France, pendant de « cote-d-azur ».
  //
  // Les trois secteurs parisiens ne couvrent que le centre, la rive gauche et
  // l'ouest. Les biens en portefeuille sont dans le 18e, le 15e, le 16e et à
  // Montmorency : deux d'entre eux ne relevaient d'aucun secteur. Le 18e
  // remontait même sur le centre historique, la comparaison par sous-chaîne
  // faisant correspondre « paris 18e » à « Paris 1 ».
  //
  // Comme pour la Côte d'Azur, ce secteur ne prive pas les autres : à égalité
  // de correspondance, sectorSlugFor retient celui qui a le MOINS de communes.
  "paris": {
    title: "Paris & Île-de-France",
    subtitle: "Des arrondissements centraux aux communes limitrophes.",
    region: "PARIS",
    locatif: "à Paris et en Île-de-France",
    cities: [
      "Paris",
      ...Array.from({ length: 20 }, (_, i) => `Paris ${i + 1}`),
      ...Array.from({ length: 20 }, (_, i) => `Paris ${i + 1}e`),
      "Paris 1er",
      "Neuilly", "Neuilly-sur-Seine", "Boulogne", "Boulogne-Billancourt",
      "Levallois-Perret", "Vincennes", "Saint-Mandé", "Montmorency",
    ],
    postalCodes: [
      ...Array.from({ length: 20 }, (_, i) => `750${String(i + 1).padStart(2, "0")}`),
      "75116",            // second code du 16e
      "92200", "92100", "92300", "94300", "95160",
    ],
    description: "De l'hypercentre historique aux communes limitrophes, Paris et sa proche couronne réunissent les marchés les plus recherchés de France : appartements haussmanniens, pied-à-terre patrimoniaux, maisons de faubourg. La rareté du foncier y soutient les valeurs, et les dispositifs de défiscalisation patrimoniale — Malraux, Monument Historique — y trouvent leurs plus beaux supports.",
    highlights: ["Arrondissements centraux et proche couronne", "Haussmannien, pied-à-terre, maisons de faubourg", "Malraux et Monument Historique"],
  },

  // Secteur d'ensemble, couvrant le Var ET les Alpes-Maritimes.
  //
  // Les trois secteurs ci-dessus ne couvraient que le Var — Fréjus, le golfe
  // de Saint-Tropez, l'Estérel — alors que les biens en portefeuille sont à
  // Cannes, Nice, Antibes et Le Rouret. Aucun ne remontait, et les trois pages
  // s'affichaient vides.
  //
  // Ce secteur les rassemble sans désactiver les autres : sectorSlugFor
  // retient le secteur ayant le MOINS de communes, donc un bien à Fréjus reste
  // rattaché à « Saint-Aygulf & Fréjus », plus étroit. Seules les communes qui
  // ne figurent nulle part ailleurs — celles des Alpes-Maritimes — tombent
  // ici. La page, elle, liste tout ce que matchesSector reconnaît : c'est la
  // vue d'ensemble de la région.
  "cote-d-azur": {
    title: "Côte d'Azur",
    locatif: "sur la Côte d'Azur",
    subtitle: "Du golfe de Saint-Tropez à Nice, Var et Alpes-Maritimes.",
    region: "COTE_D_AZUR",
    cities: [
      // Var
      "Saint-Aygulf","Fréjus","Frejus","Sainte-Maxime","Saint-Tropez","Grimaud",
      "Cogolin","Gassin","La Croix-Valmer","Agay","Les Adrets","Adrets de l'Estérel",
      // Alpes-Maritimes — littoral
      "Cannes","Le Cannet","Mandelieu","Théoule-sur-Mer","Theoule","Vallauris",
      "Golfe-Juan","Antibes","Juan-les-Pins","Villeneuve-Loubet","Cagnes-sur-Mer",
      "Nice","Villefranche-sur-Mer","Beaulieu-sur-Mer","Saint-Jean-Cap-Ferrat",
      // Alpes-Maritimes — arrière-pays
      "Mougins","Biot","Valbonne","Le Rouret","Roquefort-les-Pins","Opio",
      "Châteauneuf-Grasse","Grasse","Vence","Saint-Paul-de-Vence",
    ],
    description: "De la presqu'île de Saint-Tropez aux collines de Nice, la Côte d'Azur réunit deux départements et autant de marchés : villas de standing et domaines vue mer côté Var, appartements de caractère et propriétés de l'arrière-pays côté Alpes-Maritimes. Résidence secondaire, investissement locatif saisonnier ou valeur refuge, la clientèle y est internationale et la demande constante.",
    highlights: ["Var et Alpes-Maritimes réunis", "Cannes, Antibes, Nice, Saint-Tropez, Fréjus", "Résidence secondaire, locatif saisonnier, valeur refuge"],
  },
};

export function norm(s:string=""){ return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase(); }

// Fonction pour extraire et formater l'arrondissement de Paris
export function formatCityWithDistrict(city: string): string {
  if (!city) return "";
  
  // Si c'est déjà au format "Paris Xe" ou "Paris X", on le garde
  const parisMatch = city.match(/Paris\s*(\d{1,2})(e|er)?/i);
  if (parisMatch) {
    const arr = parisMatch[1];
    return `Paris ${arr}e`;
  }
  
  // Si c'est un code postal parisien (75001 à 75020)
  const postalMatch = city.match(/75(\d{3})/);
  if (postalMatch) {
    const arr = parseInt(postalMatch[1]);
    if (arr >= 1 && arr <= 20) {
      return `Paris ${arr}e`;
    }
  }
  
  // Sinon, retourner la ville telle quelle
  return city;
}

export function matchesSector(p:any, s: Sector){
  const city = norm(p.city||"");
  const region = norm(p.region||"");
  if (s.region && !region.includes(norm(s.region))) return false;

  // Le code postal tranche avant la commune, et lui seul peut EXCLURE : un
  // bien rue Louis Blanc a pour ville « Rouen », ce qui le faisait remonter
  // sur le cœur historique alors qu'il est rive gauche.
  const cp = codePostalDe(p);
  if (cp && s.excludePostalCodes?.includes(cp)) return false;
  if (cp && s.postalCodes?.includes(cp)) return true;

  // Comparaison à l'IDENTIQUE, comme sectorSlugFor. En sous-chaîne,
  // « sotteville-les-rouen » contient « rouen » : un bien de Sotteville — rive
  // gauche — remontait donc sur le cœur historique. Les listes de communes
  // énumèrent déjà leurs variantes (« Theoule » / « Théoule-sur-Mer »,
  // « Paris 7 » / « Paris 7e » / « 75007 »), l'exactitude ne perd rien.
  return s.cities && s.cities.length
    ? s.cities.some(c => norm(c) === city)
    : true;
}


// Secteur d'un bien, s'il en a un — utilisé pour le lien « Le marché à … » sur
// sa fiche.
//
// La comparaison est EXACTE, pas par sous-chaîne : « Paris 18e » contient
// « Paris 1 » et se retrouvait rattaché au centre historique (1er–4e).
//
// Quand plusieurs secteurs correspondent, on retient le plus spécifique — celui
// qui liste le moins de communes : Bois-Guillaume a son propre secteur en plus
// d'être cité dans « Mont-Saint-Aignan & Bois-Guillaume ».
//
// En cas d'égalité on ne renvoie rien : « Rouen » désigne aussi bien le centre
// que la rive gauche, et rien dans la fiche ne permet de trancher. Mieux vaut
// pas de lien qu'un lien faux.
export function sectorSlugFor(p: any): string | null {
  const ville = norm(p?.city || "");
  if (!ville) return null;
  const region = norm(p?.region || "");

  const cp = codePostalDe(p);
  const candidats = Object.entries(SECTORS).filter(([, s]) => {
    if (s.region && !region.includes(norm(s.region))) return false;
    // Même règle que matchesSector : le code postal prime sur la commune.
    if (cp && s.excludePostalCodes?.includes(cp)) return false;
    if (cp && s.postalCodes?.includes(cp)) return true;
    return (s.cities || []).some((c) => norm(c) === ville);
  });
  if (!candidats.length) return null;

  const taille = (s: Sector) => (s.cities || []).length;
  const min = Math.min(...candidats.map(([, s]) => taille(s)));
  const meilleurs = candidats.filter(([, s]) => taille(s) === min);
  return meilleurs.length === 1 ? meilleurs[0][0] : null;
}
