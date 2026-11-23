import type { MetadataRoute } from 'next';
import { readJSON } from '@/lib/utils';
import { isThinListing } from '@/lib/thinListing';
import { articleReader } from '@/lib/articlesData';
import { sitemapSectorSlugs, articleSitemapDate } from '@/lib/sitemapData';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com';

// Recalculé à chaque requête pour refléter les biens/articles ajoutés
// via l'admin (data/ monté depuis Cloud Storage en production). Les pages
// sans date métier fiable n'exposent volontairement pas de <lastmod> : une
// date égale à l'heure de chaque requête serait un faux signal pour Google.
export const dynamic = 'force-dynamic';

// Pages statiques indexables (hors /admin, /debug-immobilier, /avis désactivé).
const STATIC_PATHS = [
  '',
  '/immobilier',
  '/immobilier/estimation',
  '/qui-suis-je',
  '/vendre',
  '/financement',
  '/programmes',
  '/actualites',
  '/contact',
  '/references',
  '/partenaires',
  '/faq',
  '/bareme-honoraires',
  '/mentions-legales',
  '/confidentialite',
  '/cookies',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [properties, articles, programs] = await Promise.all([
    readJSON('properties.json'),
    articleReader.list(),
    readJSON('programs.json'),
  ]);

  const propertyUrls: MetadataRoute.Sitemap = (Array.isArray(properties) ? properties : [])
    .filter((p: any) => p && p.visible !== false && !isThinListing(p))
    .map((p: any) => ({ url: `${SITE}/immobilier/biens/${p.id}`, changeFrequency: 'weekly', priority: 0.8 }));

  const programUrls: MetadataRoute.Sitemap = (Array.isArray(programs) ? programs : [])
    .filter((p: any) => p && p.visible !== false)
    .map((p: any) => ({ url: `${SITE}/programmes/${p.slug || p.id}`, changeFrequency: 'weekly', priority: 0.8 }));

  const articleUrls: MetadataRoute.Sitemap = (Array.isArray(articles) ? articles : [])
    .filter((a: any) => a && a.published !== false)
    .map((a: any) => ({
      url: `${SITE}/actualites/${a.slug}`,
      lastModified: articleSitemapDate(a.publishedAt),
      changeFrequency: 'monthly',
      priority: 0.6,
    }));

  const staticUrls: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE}${path}`,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));

  const sectorUrls: MetadataRoute.Sitemap = sitemapSectorSlugs().map((slug) => ({
    url: `${SITE}/secteurs/${slug}`,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticUrls, ...sectorUrls, ...programUrls, ...propertyUrls, ...articleUrls];
}
