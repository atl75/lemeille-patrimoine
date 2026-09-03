import './globals.css';
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import Script from 'next/script';
import RevealOnScroll from '@/components/RevealOnScroll';
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
        {/* Apparition des sections au défilement — voir components/RevealOnScroll.
            Ce script est volontairement en <head> et synchrone : il pose la
            classe AVANT le premier rendu, donc pas de clignotement. Et comme
            c'est lui qui la pose, une page servie sans JavaScript — un robot
            d'indexation, par exemple — n'a rien de masqué.
            Le garde-fou de 3 s rend le contenu visible si le composant ne
            démarre pas : mieux vaut une page sans animation qu'une page vide. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){" +
              "document.documentElement.classList.add('anim');" +
              "setTimeout(function(){if(document.body&&document.body.dataset.revealPret!=='1')" +
              "document.documentElement.classList.remove('anim');},3000);}}catch(e){}",
          }}
        />
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
        <RevealOnScroll />
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
