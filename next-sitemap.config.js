const fs = require('fs');
const path = require('path');

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com',
  generateRobotsTxt: true,
  exclude: ['/admin', '/admin/*'],
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/admin/*'] },
    ],
  },
  additionalPaths: async (config) => {
    const sectors = [
      '/secteurs/paris-rive-gauche',
      '/secteurs/paris-ouest',
      '/secteurs/paris-centre-historique',
      '/secteurs/rouen-centre',
      '/secteurs/mont-saint-aignan-bois-guillaume',
      '/secteurs/saint-aygulf-frejus',
      '/secteurs/sainte-maxime-golfe-saint-tropez',
      '/secteurs/esterel-arriere-pays',
    ];

    // Pages rendues dynamiquement (searchParams / no-store) : non détectées
    // automatiquement par next-sitemap, ajoutées manuellement.
    const dynamicPages = [
      '/immobilier',
      '/programmes',
      '/avis',
      '/actualites',
    ];

    let articleSlugs = [];
    try {
      const raw = fs.readFileSync(path.join(__dirname, 'data', 'articles.json'), 'utf-8');
      const articles = JSON.parse(raw);
      articleSlugs = articles
        .filter((a) => a.published !== false)
        .map((a) => `/actualites/${a.slug}`);
    } catch {
      articleSlugs = [];
    }

    return [...sectors, ...dynamicPages, ...articleSlugs].map((loc) => ({ loc }));
  },
};
