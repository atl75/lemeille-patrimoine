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
    "description": "Agence immobilière haut de gamme et gestion de patrimoine. Spécialisée dans la transaction dans l'ancien à Paris, en Normandie et sur la Côte d'Azur. Conseils patrimoniaux sur mesure et dispositifs de défiscalisation (Malraux, Monument Historique).",
    "priceRange": "€€€€",
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
        "streetAddress": "19 rue de l'École",
        "addressLocality": "Rouen",
        "postalCode": "76000",
        "addressCountry": "FR"
      },
      {
        "@type": "PostalAddress",
        "streetAddress": "722 avenue Alfred de Musset",
        "addressLocality": "Fréjus",
        "postalCode": "83370",
        "addressCountry": "FR"
      }
    ],
    "areaServed": [
      {
        "@type": "City",
        "name": "Paris",
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
        "latitude": 49.4431,
        "longitude": 1.0993,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Rouen"
        }
      },
      {
        "@type": "GeoCoordinates",
        "latitude": 43.4334,
        "longitude": 6.7369,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Fréjus"
        }
      }
    ],
    "sameAs": [
      baseUrl
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Services immobiliers et patrimoniaux",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Transaction immobilière haut de gamme",
            "description": "Achat et vente de propriétés d'exception à Paris, Normandie et Côte d'Azur"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Gestion de patrimoine",
            "description": "Conseil patrimonial sur mesure et optimisation fiscale"
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
