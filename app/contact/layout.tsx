import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact — Agence immobilière à Rouen | Lemeille Patrimoine',
  description: 'Contactez Lemeille Patrimoine à Rouen : estimation gratuite, achat, vente et défiscalisation. Réponse sous 48 h, bureaux à Rouen et Mont-Saint-Aignan.',
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
