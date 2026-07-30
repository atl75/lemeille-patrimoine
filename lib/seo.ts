import { Metadata } from 'next';

export const defaultMetadata: Metadata = {
  title: 'Lemeille Patrimoine',
  description: "Lemeille Patrimoine – Agence spécialisée dans l'immobilier de caractère et la transaction dans l'ancien à Paris, en Normandie et sur la Côte d'Azur. Dispositifs de défiscalisation (Malraux, Monument Historique, Déficit Foncier).",
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com',
    siteName: 'Lemeille Patrimoine',
    images: [{ 
      url: (process.env.NEXT_PUBLIC_SITE_URL || '') + '/og-image.jpg', 
      width: 1200, 
      height: 630, 
      alt: 'Lemeille Patrimoine' 
    }]
  },
  twitter: { 
    card: 'summary_large_image' 
  }
};
