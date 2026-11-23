import { readJSON } from './utils.ts';

export function programCollection(data: unknown): Record<string, any>[] {
  if (!Array.isArray(data)) throw new Error('Collection programs invalide');
  return data.filter(p => p && typeof p === 'object' && !Array.isArray(p));
}

// Contrat historique conservé : programme publié entier, y compris ses lots.
// Ce filtre de visibilité n'est pas une nouvelle liste blanche de champs.
export function publicPrograms(data: unknown) {
  return programCollection(data).filter(p => p.visible !== false);
}

export function findProgramLot(program: any, numero: string) {
  const lots = Array.isArray(program?.lots) ? program.lots : [];
  return lots.find((lot: any, index: number) => lot && String(lot.numero ?? index + 1) === String(numero));
}

export function createProgramReader(read: (file: string, options: { fresh: boolean }) => Promise<unknown>) {
  const list = async () => publicPrograms(await read('programs.json', { fresh: true }));
  return {
    list,
    // Les pages conservent le contrat souple de l'ancien lecteur ; validation
    // du schéma métier et des tableaux imbriqués à traiter séparément.
    bySlugOrId: async (slug: string): Promise<any | null> => (await list()).find(p => p.slug === slug || p.id === slug) ?? null,
  };
}

export const programReader = createProgramReader(readJSON);
