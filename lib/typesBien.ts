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
  // Plan et vidéo
  floorPlan?: string;
  floorPlans?: string[];
  videoUrl?: string;
};
