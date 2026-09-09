/**
 * Mises en forme françaises partagées.
 *
 * Vit ici, et non dans un module métier, parce que ces règles servent aussi
 * bien au site public qu'à l'administration : une surface décimale s'écrit
 * « 56,59 m² » sur une fiche de bien comme dans un argumentaire de prix.
 */

/** Une surface à la française : « 56,59 m² », jamais « 56.59 m² ». */
export function surfaceFr(m2?: number | null): string {
  // null et chaîne vide passent à travers Number.isFinite : Number(null) vaut
  // ZÉRO, et un bien sans surface affichait « 0 m² » au lieu d'un tiret.
  if (m2 === null || m2 === undefined || (m2 as unknown) === '') return '—';
  const v = Number(m2);
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' m²';
}

/**
 * Lit un nombre décimal saisi à la main, virgule ou point, borné à deux
 * décimales.
 *
 * Le formulaire des biens utilisait parseInt : taper « 56,59 » enregistrait 56.
 * Une surface Carrez se déclare au centième, et l'écart se retrouve ensuite
 * dans tous les prix au mètre carré calculés à partir d'elle.
 */
export function nombreDecimalFr(saisi: string): number | undefined {
  const net = String(saisi).replace(',', '.').trim();
  if (net === '') return undefined;
  const v = parseFloat(net);
  if (!Number.isFinite(v)) return undefined;
  return Math.round(v * 100) / 100;
}
