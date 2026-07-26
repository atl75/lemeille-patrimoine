/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ne pas divulguer le framework
  poweredByHeader: false,
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
      // Dédoublonnage : la page détaillée est /confidentialite
      {
        source: '/politique-de-confidentialite',
        destination: '/confidentialite',
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
          // Anti-clickjacking : le site ne peut être affiché en iframe que par lui-même
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
          // Anti-MIME-sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Confidentialité du referrer
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restreindre les API sensibles du navigateur
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
