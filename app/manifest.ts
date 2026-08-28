import type { MetadataRoute } from 'next';

// Manifest PWA — permet d'installer la webapp « Documents terrain » sur l'écran
// d'accueil (iPhone/Android). Point d'entrée : /app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lemeille Patrimoine — Terrain',
    short_name: 'LP Terrain',
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
