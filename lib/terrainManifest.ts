import type { MetadataRoute } from 'next';

// Contrat historique conservé pour l'outil terrain déjà installé : même URL
// de manifest, même start_url (identité implicite), même portée et mêmes icônes.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lemeille Patrimoine',
    short_name: 'Lemeille',
    description: "Bons de visite et offres d'achat signés sur le terrain.",
    start_url: '/terrain',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f4ef',
    theme_color: '#1F3B2C',
    icons: [
      { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/logo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    ],
  };
}
