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
    "description": "Agence spécialisée dans l'immobilier de caractère, la transaction dans l'ancien et la défiscalisation à Paris, en Normandie et sur la Côte d'Azur. Dispositifs Malraux, Monument Historique, Déficit Foncier.",
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
      baseUrl,
      "https://x.com/lempatrimoine"
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
            "description": "Achat et vente de propriétés d'exception à Paris, Normandie et Côte d'Azur"
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
