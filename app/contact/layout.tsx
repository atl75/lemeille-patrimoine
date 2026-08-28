import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact — Agence immobilière à Rouen | Lemeille Patrimoine',
  description: 'Contactez Lemeille Patrimoine, agence immobilière à Rouen (35 rue Ganterie) et Mont-Saint-Aignan. Tél : +33 6 87 15 72 59. Estimation gratuite et conseil patrimonial.',
  alternates: {
    canonical: '/contact'
  },
  openGraph: {
    title: 'Contact — Agence immobilière à Rouen',
    description: 'Contactez Lemeille Patrimoine, agence immobilière à Rouen et Mont-Saint-Aignan.',
    url: '/contact',
    type: 'website',
  }
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
