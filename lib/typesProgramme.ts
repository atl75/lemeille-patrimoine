/**
 * Type et référentiels des programmes de défiscalisation.
 *
 * Extraits de app/admin/contenu/programmes/page.tsx (921 lignes) : le type et
 * les listes de disponibilités, de statuts et de catégories de galerie vivaient
 * en tête du composant client, donc rechargés avec lui. Ils n'ont aucune
 * dépendance React.
 */
export type Program = {
  id: string;
  slug?: string;
  title: string;
  city: string;
  region?: string;
  address?: string;
  dispositif: string;
  dispositifs?: string[];
  summary: string;
  accroche?: string;
  livraison?: string;
  intro?: string;
  caracteristiques?: string[];
  finitions?: string[];
  pointsForts?: string[];
  proximite?: { nom: string; distance?: string }[];
  lots?: any[];
  projections?: { title?: string; image?: string }[];
  // Réhabilitations livrées : paires de photos du même cadrage.
  avantApres?: { avant?: string; apres?: string; legende?: string }[];
  galerie?: { image?: string; legende?: string; categorie?: 'EXTERIEUR' | 'COMMUNES' | 'PRIVATIVES' }[];
  statut?: 'EN_COURS' | 'LIVRE';
  dpe?: { classEnergy?: string; classGES?: string; consumption?: string; emissions?: string };
  equipements?: { title?: string; subtitle?: string }[];
  documents?: { name?: string; subtitle?: string; url?: string }[];
  calendrier?: { etape?: string; date?: string; description?: string; done?: boolean }[];
  mapQuery?: string;
  virtualTourUrl?: string;
  externalUrl?: string;
  coverImage?: string;
  heroImage?: string;
  visible?: boolean;
};

export const DISPOS = [
  { code: "MALRAUX", label: "Malraux" },
  { code: "MONUMENT_HISTORIQUE", label: "Monument Historique" },
  { code: "DEFICIT_FONCIER", label: "Déficit Foncier" },
  { code: "DENORMANDIE", label: "Denormandie" },
];

export const STATUTS = [
  { code: "DISPONIBLE", label: "Disponible" },
  { code: "OPTION", label: "Sous option" },
  { code: "RESERVE", label: "Réservé" },
  { code: "VENDU", label: "Vendu" },
];

export const PROGRAMME_VIERGE: Partial<Program> = {
  title: "",
  city: "",
  dispositif: "MALRAUX",
  dispositifs: ["MALRAUX"],
  summary: "",
  externalUrl: "",
  lots: [],
  visible: true
};

// Classement des photos d'une réalisation, de l'extérieur vers l'intérieur.
export const GAL_CATEGORIES = [
  { code: 'EXTERIEUR', label: 'Extérieur' },
  { code: 'COMMUNES', label: 'Parties communes' },
  { code: 'PRIVATIVES', label: 'Parties privatives' },
] as const;

