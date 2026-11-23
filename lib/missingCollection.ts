// Collections déjà présentes en production : leur disparition n’est pas une
// autorisation d’initialisation. Ajouter une collection après inventaire préalable.
export const COLLECTIONS_PROTEGEES: readonly string[] = Object.freeze([
  'leads.json', 'mandats.json', 'properties.json', 'programs.json', 'articles.json',
]);

export class CollectionAbsente extends Error {
  readonly code = 'COLLECTION_ABSENTE';
  constructor(file: string) {
    super(`Collection requise absente : ${file}. Restauration nécessaire avant toute écriture.`);
    this.name = 'CollectionAbsente';
  }
}

export function contenuAbsent(file: string): any[] {
  if (COLLECTIONS_PROTEGEES.includes(file)) throw new CollectionAbsente(file);
  // Compatibilité des collections auxiliaires et fichiers de test. Leur
  // initialisation historique reste à inventorier ; ne pas les bloquer implicitement.
  return [];
}
