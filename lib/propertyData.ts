import { readJSON } from './utils.ts';
import { toPublicProperty } from './publicProperty.ts';

/** Une collection invalide doit remonter en erreur, jamais devenir un faux 404. */
export function findProperty(data: unknown, id: string): Record<string, any> | null {
  if (!Array.isArray(data)) throw new Error('Collection properties invalide');
  return data.find(p => p && typeof p === 'object' && !Array.isArray(p) && p.id === id) ?? null;
}

// Le lecteur de page est toujours public, même dans une requête d'administrateur.
// Aucune session, requête HTTP interne ni mémorisation entre requêtes ici.
export function createPropertyReader(read: (file: string, options: { fresh: boolean }) => Promise<unknown>) {
  return {
    byId: async (id: string) => {
      const item = findProperty(await read('properties.json', { fresh: true }), id);
      return item && item.visible !== false ? toPublicProperty(item) : null;
    },
  };
}

export const propertyReader = createPropertyReader(readJSON);
