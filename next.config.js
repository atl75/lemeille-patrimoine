/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.lemeillepatrimoine.com' }],
        destination: 'https://lemeillepatrimoine.com/:path*',
        permanent: true,
      },
    ];
  },
};
module.exports = nextConfig;
