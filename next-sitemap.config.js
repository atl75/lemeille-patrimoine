/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com',
  generateRobotsTxt: true,
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
    return sectors.map((loc)=>({ loc }));
  },
};
