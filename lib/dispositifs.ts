// Métadonnées des dispositifs de défiscalisation — source unique réutilisée par
// la page /programmes (liste des dispositifs) et par chaque page programme
// (cartes « Avantages fiscaux »). La clé correspond au code stocké sur un
// programme (champ `dispositif` / `dispositifs[]`).

export type DispositifCode = "MALRAUX" | "MONUMENT_HISTORIQUE" | "DEFICIT_FONCIER" | "DENORMANDIE";

export type DispositifInfo = {
  code: DispositifCode;
  nom: string;
  accroche: string;
  detail: string;
  features: string[];
};

export const DISPOSITIFS: Record<DispositifCode, DispositifInfo> = {
  MALRAUX: {
    code: "MALRAUX",
    nom: "Loi Malraux",
    accroche: "Jusqu'à 30 % de réduction d'impôt sur les travaux de restauration.",
    detail:
      "La Loi Malraux s'adresse aux contribuables fortement imposés qui investissent dans la restauration d'un immeuble ancien situé en secteur sauvegardé ou site patrimonial remarquable. La réduction d'impôt atteint 22 % à 30 % du montant des travaux (plafonnés à 400 000 € sur quatre ans), hors plafonnement global des niches fiscales.",
    features: [
      "Secteur sauvegardé / site patrimonial remarquable",
      "Réduction jusqu'à 120 000 € sur 4 ans",
      "Engagement de location nue 9 ans",
    ],
  },
  MONUMENT_HISTORIQUE: {
    code: "MONUMENT_HISTORIQUE",
    nom: "Monument Historique",
    accroche: "Déduction intégrale des travaux, sans plafond.",
    detail:
      "Le régime Monument Historique permet de déduire de son revenu global la totalité des charges et des travaux de restauration d'un bien classé ou inscrit, sans plafonnement et sans limite de montant. L'un des dispositifs les plus puissants pour les hauts revenus.",
    features: [
      "Bien classé ou inscrit à l'inventaire",
      "Déduction totale sur le revenu global",
      "Engagement de conservation 15 ans",
    ],
  },
  DEFICIT_FONCIER: {
    code: "DEFICIT_FONCIER",
    nom: "Déficit Foncier",
    accroche: "Imputez vos travaux sur votre revenu, jusqu'à 10 700 €/an.",
    detail:
      "Le Déficit Foncier permet de déduire les travaux de rénovation d'un bien locatif ancien de vos revenus fonciers, puis de votre revenu global à hauteur de 10 700 € par an, l'excédent étant reportable. Un levier simple et efficace pour réduire l'imposition.",
    features: [
      "Travaux de rénovation déductibles",
      "Imputation jusqu'à 10 700 €/an sur le revenu global",
      "Report du déficit excédentaire",
    ],
  },
  DENORMANDIE: {
    code: "DENORMANDIE",
    nom: "Denormandie",
    accroche: "Réduction d'impôt pour la rénovation en centre-ville.",
    detail:
      "Le dispositif Denormandie récompense la rénovation de logements anciens dans les communes éligibles (Action Cœur de Ville). La réduction d'impôt s'échelonne sur 6, 9 ou 12 ans en contrepartie d'un engagement de location, sous conditions de travaux d'amélioration.",
    features: [
      "Commune éligible « Action Cœur de Ville »",
      "Travaux d'amélioration (≥ 25 % du coût total)",
      "Réduction sur 6, 9 ou 12 ans",
    ],
  },
};

export function dispositifsOf(program: { dispositif?: string; dispositifs?: string[] }): DispositifInfo[] {
  const codes = (program.dispositifs && program.dispositifs.length ? program.dispositifs : [program.dispositif])
    .filter(Boolean) as string[];
  const seen = new Set<string>();
  const out: DispositifInfo[] = [];
  for (const c of codes) {
    const info = DISPOSITIFS[c as DispositifCode];
    if (info && !seen.has(c)) { seen.add(c); out.push(info); }
  }
  return out;
}

export function dispositifLabel(code?: string): string {
  return code && DISPOSITIFS[code as DispositifCode] ? DISPOSITIFS[code as DispositifCode].nom : (code || "");
}
