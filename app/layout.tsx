import './globals.css';
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import Script from 'next/script';
import { SiteChrome } from '@/components/SiteChrome';
import { OrganizationSchema } from '@/components/OrganizationSchema';
import { Providers } from './providers';

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Lemeille Patrimoine — Immobilier & défiscalisation',
  description: "Immobilier de caractère et défiscalisation à Paris, Normandie et Côte d'Azur. Transaction dans l'ancien et dispositifs Malraux, Monument Historique, Déficit Foncier.",
  // Pas de canonical global ici : il serait hérité par toutes les pages
  // (chaque page définit son propre canonical ; l'accueil le fait ci-dessous).
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com',
    siteName: 'Lemeille Patrimoine',
    title: 'Lemeille Patrimoine — Immobilier de caractère & défiscalisation',
    description: "Agence spécialisée dans l'immobilier de caractère et la défiscalisation à Paris, en Normandie et sur la Côte d'Azur.",
    images: [{
      url: '/og-image.jpg?v=4',
      width: 1200,
      height: 630,
      alt: 'Lemeille Patrimoine — Immobilier de caractère & défiscalisation'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lemeille Patrimoine — Immobilier & défiscalisation',
    description: "Immobilier de caractère & défiscalisation - Paris, Normandie, Côte d'Azur",
    images: ['/og-image.jpg?v=4'],
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ID Google Analytics (public). Surchargeable par NEXT_PUBLIC_GA_MEASUREMENT_ID.
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-W152DJDQWE';
  
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={inter.className}>
        <OrganizationSchema />
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="lazyOnload"
            />
            <Script id="google-analytics" strategy="lazyOnload">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
