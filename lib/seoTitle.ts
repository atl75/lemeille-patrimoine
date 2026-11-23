// Budget éditorial pour les suffixes facultatifs, pas une limite Google.
// Le sujet principal reste entier : une coupe aveugle peut retirer le lieu,
// l'année ou le qualificatif qui distingue deux pages.
const BRAND = 'Lemeille Patrimoine';
const MAX = 62;

/**
 * @param parts Éléments du titre, du plus important au moins important.
 *              Les derniers sont retirés en premier si le titre est trop long.
 * @param sep   Séparateur entre les éléments conservés.
 */
export function seoTitle(parts: (string | null | undefined)[], sep = ' · '): string {
  const items = parts.map(p => (p || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!items.length) return BRAND;
  // Un titre éditorial peut déjà porter la marque.
  if (items[0].includes(BRAND)) return items[0];

  // On retire les éléments de queue tant que « titre | marque » dépasse.
  for (let n = items.length; n > 0; n--) {
    const base = items.slice(0, n).join(sep);
    if (`${base} | ${BRAND}`.length <= MAX) return `${base} | ${BRAND}`;
  }

  // Omettre le suffixe de marque, jamais une partie du titre principal.
  return items[0];
}
