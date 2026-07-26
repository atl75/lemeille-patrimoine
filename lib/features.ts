export const FEATURE_CATEGORIES: Record<string, string[]> = {
  'Intérieur & Confort': [
    'Cheminée',
    'Parquet',
    'Dressing',
    'Suite parentale',
    'Cuisine équipée',
    'Climatisation',
    'Ascenseur'
  ],
  'Extérieur & Annexes': [
    'Jardin',
    'Terrasse',
    'Balcon',
    'Garage',
    'Parking',
    'Cave',
    'Piscine'
  ],
  'Vue & Exposition': [
    'Vue mer',
    'Vue dégagée',
    'Exposition sud',
    'Sans vis-à-vis',
    'Calme'
  ],
  'État & Technique': [
    'Rénové récemment',
    'Double vitrage'
  ]
};

export function allFeatures(): string[] {
  return Object.values(FEATURE_CATEGORIES).flat();
}
