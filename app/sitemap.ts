import type { MetadataRoute } from 'next';
import { readJSON } from '@/lib/utils';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com';

// Recalculé à chaque requête pour refléter les biens/articles ajoutés
// via l'admin (data/ monté depuis Cloud Storage en production).
export const dynamic = 'force-dynamic';

// Pages sectorielles SEO (routes /secteurs/[slug], définies dans
// app/secteurs/[slug]/page.tsx). Liste stable, maintenue ici.
const SECTOR_SLUGS = [
  // Rouen & Plateau Nord — cœur de l'activité (priorité SEO locale)
  'rouen-centre',
  'rouen-rive-gauche',
  'mont-saint-aignan-bois-guillaume',
  'bois-guillaume',
  'bihorel',
  'isneauville',
  'mesnil-esnard-franqueville',
  // Zones complémentaires
  'paris-rive-gauche',
  'paris-ouest',
  'paris-centre-historique',
  'saint-aygulf-frejus',
  'sainte-maxime-golfe-saint-tropez',
  'esterel-arriere-pays',
];

// Pages statiques indexables (hors /admin, /debug-immobilier, /avis désactivé).
const STATIC_PATHS = [
  '',
  '/immobilier',
  '/immobilier/estimation',
  '/vendre',
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
  const now = new Date();

  const [properties, articles, programs] = await Promise.all([
    readJSON('properties.json'),
    readJSON('articles.json'),
    readJSON('programs.json'),
  ]);

  const propertyUrls: MetadataRoute.Sitemap = (Array.isArray(properties) ? properties : [])
    .filter((p: any) => p && p.visible !== false)
    .map((p: any) => ({ url: `${SITE}/immobilier/biens/${p.id}`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 }));

  const programUrls: MetadataRoute.Sitemap = (Array.isArray(programs) ? programs : [])
    .filter((p: any) => p && p.visible !== false)
    .map((p: any) => ({ url: `${SITE}/programmes/${p.slug || p.id}`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 }));

  const articleUrls: MetadataRoute.Sitemap = (Array.isArray(articles) ? articles : [])
    .filter((a: any) => a && a.published !== false)
    .map((a: any) => ({
      url: `${SITE}/actualites/${a.slug}`,
      lastModified: a.publishedAt ? new Date(a.publishedAt) : now,
      changeFrequency: 'monthly',
      priority: 0.6,
    }));

  const staticUrls: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));

  const sectorUrls: MetadataRoute.Sitemap = SECTOR_SLUGS.map((slug) => ({
    url: `${SITE}/secteurs/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticUrls, ...sectorUrls, ...programUrls, ...propertyUrls, ...articleUrls];
}
