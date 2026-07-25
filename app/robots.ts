import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/admin/', '/debug-immobilier'],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
