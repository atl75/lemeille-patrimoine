/** Quantile interpolé, même convention pour DVF et annonces. Entrées triées. */
export function quantile(tries: number[], p: number): number {
  if (!tries.length || p < 0 || p > 1) return NaN;
  const i = (tries.length - 1) * p;
  const bas = Math.floor(i), haut = Math.ceil(i);
  return bas === haut ? tries[bas] : tries[bas] + (tries[haut] - tries[bas]) * (i - bas);
}
