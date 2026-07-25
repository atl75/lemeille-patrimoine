/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Loader personnalisé : les photos Cloudinary sont servies directement
    // par le CDN Cloudinary (rapide, cache mondial) au lieu de l'optimiseur
    // next/image de Cloud Run. Voir lib/cloudinaryLoader.js.
    loader: 'custom',
    loaderFile: './lib/cloudinaryLoader.js',
    qualities: [75, 85],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.lemeillepatrimoine.com' }],
        destination: 'https://lemeillepatrimoine.com/:path*',
        permanent: true,
      },
      // Recentrage sur la défiscalisation : /patrimoine → /programmes
      {
        source: '/patrimoine',
        destination: '/programmes',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // HSTS : force le HTTPS côté navigateur (audit SEO/sécurité)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
