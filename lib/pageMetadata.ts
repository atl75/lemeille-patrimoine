import type { Metadata } from 'next';
import { OG_IMAGE } from './ogImage.ts';

/** Choisit le premier texte renseigné, sans tronquer une phrase éditoriale. */
export function seoText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const text = value.replace(/\s+/g, ' ').trim();
    if (text) return text;
  }
  return '';
}

type PageMetadata = Omit<Metadata, 'title' | 'description' | 'alternates'> & {
  title: string;
  description: string;
  alternates: NonNullable<Metadata['alternates']> & { canonical: string };
};

/**
 * Next remplace les objets sociaux imbriqués au lieu de les fusionner.
 * Chaque page publique fournit donc son URL et un bloc complet, sans hériter
 * de l'accueil. Les robots, images propres et autres attributs sont préservés.
 */
export function pageMetadata(input: PageMetadata): Metadata {
  const title = seoText(input.title);
  const description = seoText(input.description);
  const canonical = input.alternates.canonical;
  if (!title || !description || !canonical.startsWith('/') || canonical.startsWith('//')) {
    throw new Error('Métadonnées publiques : titre, description et chemin canonique requis');
  }
  const images = input.openGraph?.images ?? OG_IMAGE;
  return {
    ...input,
    title,
    description,
    openGraph: {
      type: 'website',
      locale: 'fr_FR',
      siteName: 'Lemeille Patrimoine',
      ...input.openGraph,
      title,
      description,
      url: canonical,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      ...input.twitter,
      title,
      description,
      images: input.twitter?.images ?? images,
    },
  };
}
