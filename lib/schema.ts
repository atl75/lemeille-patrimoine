export function orgJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: 'Lemeille Patrimoine',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com',
    logo: (process.env.NEXT_PUBLIC_SITE_URL || '') + '/logo.png',
    description: "Agence immobilière et gestion de patrimoine haut de gamme. Paris, Normandie, Côte d'Azur.",
    address: [
      { '@type': 'PostalAddress', streetAddress: "19 rue de l'École", addressLocality: 'Rouen', postalCode: '76000', addressCountry: 'FR' },
      { '@type': 'PostalAddress', streetAddress: '722 avenue Alfred de Musset', addressLocality: 'Saint-Aygulf', postalCode: '83370', addressCountry: 'FR' }
    ],
    areaServed: ['Paris', 'Normandie', "Côte d'Azur"],
    parentOrganization: { '@type': 'Organization', name: 'Novus Capital', url: 'https://www.pappers.fr/entreprise/novus-capital-937847937', identifier: 'SIREN 937 847 937' }
  };
}
