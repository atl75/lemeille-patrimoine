/**
 * Forme d'un bien telle que l'admin la manipule.
 *
 * Extrait de app/admin/contenu/biens/page.tsx le 3 septembre 2026, pour que la
 * page liste et la fiche par bien parlent du même type sans le dupliquer.
 * C'est la première tranche du découpage de ce fichier de 2 227 lignes.
 */
export type Bien = {
  id: string;
  title: string;
  type: string;
  city: string;
  region: string;
  price: number;
  priceOnRequest?: boolean;
  surface: number;
  rooms: number;
  landSize?: number;
  annexSurface?: number;
  propertyTaxAmount?: number;
  coproChargesMonthly?: number;
  netSellerAmount?: number;
  commissionAmount?: number;
  commissionPercentage?: number;
  finalSalePrice?: number;
  negotiatedCommission?: number;
  sequestreAmount?: number;
  notaryClerk?: { name?: string; email?: string };
  buyerFirstName?: string;
  buyerLastName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerAddress?: string;
  sellerNotary?: {
    officeName?: string;
    notaryName?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
    clerkName?: string;
    clerkEmail?: string;
  };
  buyerNotary?: {
    officeName?: string;
    notaryName?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
    clerkName?: string;
    clerkEmail?: string;
  };
  furniture?: { label?: string; value?: number }[];
  description: string;
  images: string[];
  features: string[];
  map: {
    precision: string;
    query: string;
    zoom: number;
  };
  dpe: {
    classEnergy: string;
    classGES: string;
    consumptionKwh: number;
    emissionsKg: number;
    date: string;
    ref: string;
  };
  featured?: boolean;
  entreeDeGamme?: boolean;
  visible?: boolean;
  sold?: boolean;
  status?: 'AVAILABLE' | 'OFFER_RECEIVED' | 'UNDER_OFFER' | 'SOLD';
  soldDate?: string;
  sortOrder?: number;
  // Informations cadastrales
  cadastralReference?: string;
  // Propriétaires
  owners?: Array<{type: string, firstName?: string, lastName?: string, name?: string, siren?: string, legalForm?: string, managerFirstName?: string, managerLastName?: string, managerRole?: string, email?: string, phone?: string, address?: string}>;
  mandateType?: 'SIMPLE' | 'EXCLUSIF' | 'SUCCES';
  mandateNumber?: string;
  mandateHonorairesCharge?: 'VENDEUR' | 'ACQUEREUR';
  occupancy?: 'LIBRE' | 'OCCUPE';
  mandatePlace?: string;
  mandateSignToken?: string;
  mandateSignStatus?: 'PENDING' | 'SIGNED';
  mandateSignature?: { signedAt?: string };
  // Documents
  titleDeed?: string;
  dpeDocument?: string;
  propertyTax?: string;
  mandate?: string;
  estimation?: string;
  propertyRules?: string;
  agMinutes?: string[];
  chargesStatement?: string;
  // Argumentaire de baisse de prix, préparé pour l'entretien vendeur
  ajustementPrix?: {
    comparables?: import('./ajustementPrix').Comparable[];
    prixCible?: number;
    dateMiseEnVente?: string;
    commentaire?: string;
    /** Prix de référence du secteur, relevé par l'agent sur une page tierce. */
    reference?: { m2: number; bas?: number; haut?: number; source?: string };
    /** Réglages de la recherche DVF, pour retrouver le même document. */
    dvfRayon?: number;
    dvfDepuis?: number;
    dvfPieces?: number;
    majAt?: string;
  };
  // Plan et vidéo
  floorPlan?: string;
  floorPlans?: string[];
  videoUrl?: string;
};

/**
 * Valeurs de départ d'un bien neuf. Vivait dans la page liste ; partagé depuis
 * que la création a sa propre adresse (/admin/contenu/biens/nouveau).
 */
export const BIEN_VIERGE: Partial<Bien> = {
  title: "",
  type: "APPARTEMENT",
  city: "",
  region: "PARIS",
  price: 0,
  surface: 0,
  rooms: 0,
  landSize: undefined,
  description: "",
  images: [],
  features: [],
  map: { precision: "AREA", query: "", zoom: 14 },
  dpe: {
    classEnergy: "D",
    classGES: "D",
    consumptionKwh: 0,
    emissionsKg: 0,
    date: new Date().toISOString().split('T')[0],
    ref: ""
  },
  featured: false,
  visible: true,
  sold: false,
  status: 'AVAILABLE',
  soldDate: undefined,
  cadastralReference: undefined,
  owners: [],
  titleDeed: undefined,
  dpeDocument: undefined,
  propertyTax: undefined,
  mandate: undefined,
  estimation: undefined,
  propertyRules: undefined,
  agMinutes: [],
  chargesStatement: undefined,
  floorPlan: undefined,
  videoUrl: undefined
};
