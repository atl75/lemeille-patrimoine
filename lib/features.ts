export const FEATURE_CATEGORIES: Record<string, string[]> = {
  'Architecture & Charme': [
    'Cheminée',
    'Moulures',
    'Parquet ancien',
    'Plafond cathédrale',
    'Verrière d’atelier',
    'Boiseries murales',
    'Rosaces & corniches',
    'Ferronneries d’époque'
  ],
  'Extérieurs & Dépendances': [
    'Jardin',
    'Terrasse',
    'Balcon filant',
    'Cour intérieure',
    'Véranda',
    'Pool house',
    'Cuisine d’été',
    'Sous-sol',
    'Cave voûtée',
    'Garage',
    'Parking',
    'Portail électrique'
  ],
  'Confort & Aménagement': [
    'Lingerie / Buanderie',
    'Dressing',
    'Bureau indépendant',
    'Suite parentale',
    'Salle de sport',
    'Home cinéma',
    'Bibliothèque sur mesure',
    'Climatisation réversible',
    'Chauffage au sol',
    'Domotique',
    'Alarme & vidéophone',
    'Aspiration centralisée',
    'Ascenseur'
  ],
  'Vue & Environnement': [
    'Vue mer',
    'Vue Seine',
    'Vue cathédrale',
    'Vue dégagée',
    'Exposition sud',
    'Sans vis-à-vis',
    'Calme absolu',
    'Environnement paysager',
    'Accès plage à pied'
  ],
  'Techniques & Matériaux': [
    'Double vitrage',
    'Isolation récente',
    'Toiture refaite',
    'Électricité rénovée',
    'Cuisine haut de gamme équipée',
    'Salle de bain en marbre',
    'Pierres apparentes',
    'Menuiseries sur mesure'
  ],
  'Prestige': [
    'Piscine chauffée',
    'Spa / Jacuzzi',
    'Sauna',
    'Hammam',
    'Cave à vin',
    'Orangerie',
    'Serre ancienne',
    'Dépendance aménagée',
    'Appartement de service',
    'Sécurité 24h/24',
    'Gardien résident'
  ]
};

export function allFeatures(): string[] {
  return Object.values(FEATURE_CATEGORIES).flat();
}
