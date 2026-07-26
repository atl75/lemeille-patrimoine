type PropertyLd = {
  id: string;
  title: string;
  type?: string; // APPARTEMENT | MAISON
  city?: string;
  region?: string;
  price?: number;
  surface?: number;
  rooms?: number;
  description?: string;
  images?: string[];
  sold?: boolean;
  status?: string;
};

// Données structurées schema.org pour une fiche de bien : aide les moteurs
// de recherche à comprendre « bien à vendre, prix, localité, surface,
// pièces » et à afficher des résultats enrichis.
export default function PropertySeoJsonLd({ property: p }: { property: PropertyLd }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://lemeillepatrimoine.com";
  const url = `${base}/immobilier/biens/${p.id}`;
  const abs = (src: string) =>
    src?.startsWith("http") ? src : `${base}${src?.startsWith("/") ? "" : "/"}${src}`;
  const images =
    Array.isArray(p.images) && p.images.length ? p.images.map(abs) : [`${base}/og-image.jpg`];
  const region = p.region ? String(p.region).replaceAll("_", " ") : undefined;
  const residenceType = p.type === "MAISON" ? "SingleFamilyResidence" : "Apartment";
  const available = !(p.sold || p.status === "SOLD");

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "@id": url,
    url,
    name: p.title,
    ...(p.description ? { description: p.description } : {}),
    image: images,
    ...(p.price
      ? {
          offers: {
            "@type": "Offer",
            price: p.price,
            priceCurrency: "EUR",
            availability: available
              ? "https://schema.org/InStock"
              : "https://schema.org/SoldOut",
            url,
          },
        }
      : {}),
    mainEntity: {
      "@type": residenceType,
      name: p.title,
      ...(p.rooms ? { numberOfRooms: p.rooms } : {}),
      ...(p.surface
        ? { floorSize: { "@type": "QuantitativeValue", value: p.surface, unitCode: "MTK" } }
        : {}),
      address: {
        "@type": "PostalAddress",
        ...(p.city ? { addressLocality: p.city } : {}),
        ...(region ? { addressRegion: region } : {}),
        addressCountry: "FR",
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
