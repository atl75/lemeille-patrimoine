/**
 * Validation d'une fiche bien avant enregistrement.
 *
 * Extraite de components/admin/FicheBienFormulaire : ces règles décidaient si
 * l'enregistrement passait ou non, et vivaient au milieu de 1 479 lignes de
 * rendu — donc impossibles à tester. Elles sont pures : aucune dépendance à
 * React, ni au DOM.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ErreursProprietaire = { email: string; siren: string };

/** Une entrée par propriétaire, dans le même ordre que la liste reçue. */
export function erreursProprietaires(owners: any): ErreursProprietaire[] {
  return (Array.isArray(owners) ? owners : []).map((o: any) => ({
    email: o?.email && !EMAIL.test(String(o.email).trim()) ? "Adresse email invalide" : "",
    siren:
      o?.type === "COMPANY" && o?.siren && !/^\d{9}$/.test(String(o.siren).replace(/\s/g, ""))
        ? "Le SIREN doit comporter 9 chiffres"
        : "",
  }));
}

/** Un prix nul ou négatif est refusé — sauf si le bien est « prix sur demande ». */
export function erreurPrix(bien: any): string {
  if (!bien || bien.priceOnRequest || bien.price == null) return "";
  return isNaN(Number(bien.price)) || Number(bien.price) <= 0 ? "Prix invalide" : "";
}

/** Le net vendeur ne peut pas dépasser le prix FAI : la commission serait négative. */
export function erreurNetVendeur(bien: any): string {
  if (!bien || bien.netSellerAmount == null || bien.price == null) return "";
  return Number(bien.netSellerAmount) > Number(bien.price)
    ? "Le net vendeur ne peut pas dépasser le prix FAI"
    : "";
}

/** Toutes les erreurs bloquantes, prêtes à être affichées. */
export function erreursFiche(bien: any): string[] {
  return [
    erreurPrix(bien),
    erreurNetVendeur(bien),
    ...erreursProprietaires(bien?.owners).flatMap((e) => [e.email, e.siren]),
  ].filter(Boolean);
}
