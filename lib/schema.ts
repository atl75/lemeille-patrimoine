export function orgJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: 'Lemeille Patrimoine',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com',
    logo: (process.env.NEXT_PUBLIC_SITE_URL || '') + '/logo.png',
    description: "Agence immobilière à Rouen, Mont-Saint-Aignan, Bois-Guillaume et Plateau Nord : maisons et appartements de caractère, estimation gratuite et défiscalisation.",
    address: [
      { '@type': 'PostalAddress', streetAddress: '50 rue de la Garenne', addressLocality: 'Mont-Saint-Aignan', postalCode: '76130', addressCountry: 'FR' },
      { '@type': 'PostalAddress', streetAddress: '35 rue Ganterie', addressLocality: 'Rouen', postalCode: '76000', addressCountry: 'FR' },
      { '@type': 'PostalAddress', streetAddress: '722 avenue Alfred de Musset', addressLocality: 'Saint-Aygulf', postalCode: '83370', addressCountry: 'FR' }
    ],
    areaServed: ['Rouen', 'Mont-Saint-Aignan', 'Bois-Guillaume', 'Bihorel', 'Isneauville', 'Déville-lès-Rouen', 'Le Mesnil-Esnard', 'Normandie', 'Seine-Maritime', 'Paris', "Côte d'Azur"],
    priceRange: '€€€',
    parentOrganization: { '@type': 'Organization', name: 'Novus Capital', url: 'https://www.pappers.fr/entreprise/novus-capital-937847937', identifier: 'SIREN 937 847 937' }
  };
}
