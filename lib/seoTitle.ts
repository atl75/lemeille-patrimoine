// Construction des balises <title>.
//
// Google tronque autour de 60-65 caractères : au-delà, la fin du titre — donc
// souvent le nom de l'agence — n'est jamais affichée. On assemble donc le titre
// en ajoutant la marque seulement si elle tient, et en retirant au besoin les
// éléments les moins porteurs (région, surface) plutôt que de laisser couper.
const BRAND = 'Lemeille Patrimoine';
const MAX = 62;

/**
 * @param parts Éléments du titre, du plus important au moins important.
 *              Les derniers sont retirés en premier si le titre est trop long.
 * @param sep   Séparateur entre les éléments conservés.
 */
export function seoTitle(parts: (string | null | undefined)[], sep = ' · '): string {
  const items = parts.map(p => (p || '').trim()).filter(Boolean);
  if (!items.length) return BRAND;

  // On retire les éléments de queue tant que « titre | marque » dépasse.
  for (let n = items.length; n > 0; n--) {
    const base = items.slice(0, n).join(sep);
    if (`${base} | ${BRAND}`.length <= MAX) return `${base} | ${BRAND}`;
  }

  // Même seul, le premier élément ne laisse pas de place à la marque : on la
  // sacrifie (Google affiche le nom du site à côté du titre de toute façon).
  const seul = items[0];
  return seul.length <= MAX ? seul : seul.slice(0, MAX - 1).trimEnd() + '…';
}
