import type { MetadataRoute } from 'next';
import terrainManifest from './terrainManifest.ts';

export default function publicManifest(): MetadataRoute.Manifest {
  return {
    ...terrainManifest(),
    id: '/',
    start_url: '/',
    description: 'Agence immobilière à Rouen, Mont-Saint-Aignan et Bois-Guillaume. Maisons et appartements de caractère, conseil en défiscalisation.',
    // Réutiliser le favicon vectoriel existant sans déclarer de fausses tailles PNG.
    // Les icônes PNG carrées et la recette d'installation iOS/Android restent à qualifier.
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
