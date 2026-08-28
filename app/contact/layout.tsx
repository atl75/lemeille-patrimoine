import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact - Bureaux Rouen & Fréjus | Lemeille Patrimoine',
  description: 'Contactez Lemeille Patrimoine. Bureaux à Rouen (35 rue Ganterie) et Fréjus (722 avenue Alfred de Musset). Tél : +33 6 87 15 72 59. Conseil immobilier et patrimonial.',
  alternates: {
    canonical: '/contact'
  },
  openGraph: {
    title: 'Contact - Bureaux Rouen & Fréjus',
    description: 'Contactez Lemeille Patrimoine. Bureaux à Rouen et Fréjus.',
    url: '/contact',
    type: 'website',
  }
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
