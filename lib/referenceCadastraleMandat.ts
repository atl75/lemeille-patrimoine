/** Lecture compatible avec les anciens brouillons, sans migration des contrats. */
export function referenceCadastraleMandat(bien: { cadastralReference?: unknown; cadastre?: unknown }): string | undefined {
  const canonique = typeof bien.cadastralReference === 'string' ? bien.cadastralReference.trim() : '';
  const ancienne = typeof bien.cadastre === 'string' ? bien.cadastre.trim() : '';
  return canonique || ancienne || undefined;
}
