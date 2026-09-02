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
  title: 'Lemeille Patrimoine — Agence immobilière à Rouen',
  description: "Agence immobilière à Rouen, Mont-Saint-Aignan et Bois-Guillaume. Maisons et appartements de caractère, conseil en défiscalisation.",
  // Pas de canonical global ici : il serait hérité par toutes les pages
  // (chaque page définit son propre canonical ; l'accueil le fait ci-dessous).
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com',
    siteName: 'Lemeille Patrimoine',
    title: 'Lemeille Patrimoine — Agence immobilière à Rouen & Plateau Nord',
    description: "Agence immobilière de caractère à Rouen, Mont-Saint-Aignan, Bois-Guillaume et Plateau Nord.",
    images: [{
      url: '/og-image.jpg?v=5',
      width: 1200,
      height: 630,
      alt: 'Lemeille Patrimoine — Immobilier de caractère & défiscalisation'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lemeille Patrimoine — Immobilier & défiscalisation',
    description: "Agence immobilière à Rouen — maisons et appartements de caractère",
    images: ['/og-image.jpg?v=5'],
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com'),
  // PWA installable (écran d'accueil iPhone/Android) pour la webapp /terrain.
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'LP Terrain', statusBarStyle: 'black-translucent' },
  icons: { apple: '/logo.png' },
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
