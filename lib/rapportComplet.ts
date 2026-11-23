export const CHAMPS_RAPPORT = {
  surfaceNature:'Nature et justificatif de la surface',
  occupation:'Occupation et disponibilité du bien',
  documents:'Documents consultés et dates (DPE, titre, copropriété…)',
  travaux:'État, travaux, devis et charges à vérifier',
  reserves:'Réserves et vérifications restant à effectuer',
  strategie:'Stratégie de commercialisation proposée',
} as const;

export function erreurRapport(r: unknown): string | null {
  if(r == null) return null;
  if(typeof r !== 'object' || Array.isArray(r)) return 'Compléments du rapport invalides.';
  for(const [k,v] of Object.entries(r)) {
    if(!Object.hasOwn(CHAMPS_RAPPORT,k) || typeof v !== 'string' || v.length>4000) return 'Compléments du rapport : champs textuels de 4 000 caractères maximum attendus.';
  }
  return null;
}
