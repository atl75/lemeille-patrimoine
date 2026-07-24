import './globals.css';
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import Script from 'next/script';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import ChatWidget from '@/components/ChatWidget';
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
  title: 'Lemeille Patrimoine — Immobilier & gestion de patrimoine',
  description: "Immobilier haut de gamme et gestion de patrimoine à Paris, Normandie et Côte d'Azur. Conseils patrimoniaux sur mesure et défiscalisation (Malraux, Monument Historique).",
  alternates: {
    canonical: '/'
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com',
    siteName: 'Lemeille Patrimoine',
    title: 'Lemeille Patrimoine - Immobilier haut de gamme & Gestion de patrimoine',
    description: "Agence immobilière haut de gamme et gestion de patrimoine. Spécialisée dans la transaction dans l'ancien à Paris, en Normandie et sur la Côte d'Azur.",
    images: [{ 
      url: '/og-image.jpg',
      width: 1200, 
      height: 630, 
      alt: 'Lemeille Patrimoine' 
    }]
  },
  twitter: { 
    card: 'summary_large_image',
    title: 'Lemeille Patrimoine - Immobilier & Gestion de patrimoine',
    description: "Immobilier haut de gamme & gestion de patrimoine - Paris, Normandie, Côte d'Azur",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  
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
          <Header />
          {children}
          <Footer />
          <WhatsAppButton />
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
