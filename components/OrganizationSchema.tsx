export function OrganizationSchema() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lemeillepatrimoine.com";
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": "Lemeille Patrimoine",
    "alternateName": "Novus Capital",
    "url": baseUrl,
    "logo": {
      "@type": "ImageObject",
      "url": `${baseUrl}/logo.png`,
      "width": 200,
      "height": 200
    },
    "image": `${baseUrl}/og-image.jpg`,
    "description": "Agence immobilière à Rouen, Mont-Saint-Aignan, Bois-Guillaume et sur l'ensemble du Plateau Nord : vente de maisons et appartements de caractère, estimation gratuite et défiscalisation (Malraux, Monument Historique, Déficit Foncier).",
    "priceRange": "€€€€",
    "founder": {
      "@type": "Person",
      "name": "Arthur Lemeille",
      "jobTitle": "Agent immobilier — fondateur",
      // Sans photo ni profils rattachés, Google ne peut relier la personne à
      // aucune identité vérifiable — c'est le signal d'expertise qui manquait.
      "url": `${baseUrl}/qui-suis-je`,
      "image": `${baseUrl}/images/arthur-lemeille.jpg`,
      "sameAs": [
        "https://www.instagram.com/lempatrimoine",
        "https://www.orias.fr/home/showIntermediaire/89"
      ],
      "worksFor": { "@type": "Organization", "name": "Lemeille Patrimoine" },
      "alumniOf": [
        { "@type": "CollegeOrUniversity", "name": "NEOMA Business School", "address": { "@type": "PostalAddress", "addressLocality": "Rouen", "addressCountry": "FR" } },
        { "@type": "CollegeOrUniversity", "name": "KEDGE Business School", "address": { "@type": "PostalAddress", "addressLocality": "Bordeaux", "addressCountry": "FR" } }
      ],
      "knowsAbout": ["Transaction immobilière", "Immobilier de caractère", "Défiscalisation immobilière", "Loi Malraux", "Monument Historique", "Déficit foncier", "Marché immobilier de Rouen"],
      "hasCredential": [
        { "@type": "EducationalOccupationalCredential", "credentialCategory": "Carte professionnelle", "name": "CPI 7606 2024 000 000 038 — Transactions sur immeubles et fonds de commerce (CCI Rouen Métropole)" },
        { "@type": "EducationalOccupationalCredential", "credentialCategory": "Master", "name": "Master en école de commerce (KEDGE Business School)" }
      ]
    },
    "telephone": "+33687157259",
    "email": "arthur.lemeille@lemeillepatrimoine.com",
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "telephone": "+33687157259",
        "contactType": "customer service",
        "email": "arthur.lemeille@lemeillepatrimoine.com",
        "areaServed": "FR",
        "availableLanguage": ["French"]
      }
    ],
    "address": [
      {
        "@type": "PostalAddress",
        "streetAddress": "50 rue de la Garenne",
        "addressLocality": "Mont-Saint-Aignan",
        "postalCode": "76130",
        "addressCountry": "FR"
      },
      {
        "@type": "PostalAddress",
        "streetAddress": "35 rue Ganterie",
        "addressLocality": "Rouen",
        "postalCode": "76000",
        "addressCountry": "FR"
      }
    ],
    "areaServed": [
      {
        "@type": "City",
        "name": "Rouen",
        "addressCountry": "FR"
      },
      {
        "@type": "City",
        "name": "Mont-Saint-Aignan",
        "addressCountry": "FR"
      },
      {
        "@type": "City",
        "name": "Bois-Guillaume",
        "addressCountry": "FR"
      },
      {
        "@type": "City",
        "name": "Bihorel",
        "addressCountry": "FR"
      },
      {
        "@type": "City",
        "name": "Isneauville",
        "addressCountry": "FR"
      },
      {
        "@type": "City",
        "name": "Le Mesnil-Esnard",
        "addressCountry": "FR"
      },
      {
        "@type": "City",
        "name": "Franqueville-Saint-Pierre",
        "addressCountry": "FR"
      },
      {
        "@type": "City",
        "name": "Déville-lès-Rouen",
        "addressCountry": "FR"
      },
      {
        "@type": "City",
        "name": "Bonsecours",
        "addressCountry": "FR"
      },
      {
        "@type": "City",
        "name": "Paris",
        "addressCountry": "FR"
      },
      {
        "@type": "AdministrativeArea",
        "name": "Métropole Rouen Normandie",
        "addressCountry": "FR"
      },
      {
        "@type": "AdministrativeArea",
        "name": "Seine-Maritime",
        "addressCountry": "FR"
      },
      {
        "@type": "AdministrativeArea",
        "name": "Normandie",
        "addressCountry": "FR"
      },
      {
        "@type": "AdministrativeArea",
        "name": "Côte d'Azur",
        "addressCountry": "FR"
      }
    ],
    "geo": [
      {
        "@type": "GeoCoordinates",
        "latitude": 49.4642,
        "longitude": 1.0876,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Mont-Saint-Aignan"
        }
      },
      {
        "@type": "GeoCoordinates",
        "latitude": 49.4425,
        "longitude": 1.0954,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Rouen"
        }
      }
    ],
    "sameAs": [
      baseUrl,
      "https://x.com/lempatrimoine",
      "https://www.youtube.com/channel/UCynpnLvgiGdgZH2OIDmYiYA"
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Services immobiliers et défiscalisation",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Transaction d'immobilier de caractère",
            "description": "Achat et vente de maisons et appartements de caractère à Rouen et sur le Plateau Nord"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Défiscalisation immobilière",
            "description": "Programmes Malraux, Monument Historique, Déficit Foncier"
          }
        }
      ]
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
