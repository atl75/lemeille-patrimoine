/** Index circulaire ; aucun modulo par zéro pour une galerie vide. */
export function galleryIndex(index: number, count: number): number {
  if (!Number.isInteger(count) || count <= 0 || !Number.isFinite(index)) return 0;
  return ((Math.trunc(index) % count) + count) % count;
}

export function adjacentPhotos(index: number, count: number): number[] {
  if (count <= 1) return [];
  const current = galleryIndex(index, count);
  return [...new Set([1, -1, 2, -2].map(delta => galleryIndex(current + delta, count)))].filter(i => i !== current);
}
