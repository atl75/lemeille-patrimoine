type ProgramLd = {
  id: string;
  slug?: string;
  title: string;
  city?: string;
  region?: string;
  address?: string;
  summary?: string;
  intro?: string;
  heroImage?: string;
  coverImage?: string;
  lots?: any[];
};

// Données structurées schema.org pour une page programme (immeuble en
// restauration avec plusieurs lots). Type ApartmentComplex : aide les moteurs
// à comprendre « ensemble immobilier, adresse, nombre de logements, fourchette
// de prix ».
export default function ProgramSeoJsonLd({ program: p }: { program: ProgramLd }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://lemeillepatrimoine.com";
  const url = `${base}/programmes/${p.slug || p.id}`;
  const abs = (src: string) =>
    src?.startsWith("http") ? src : `${base}${src?.startsWith("/") ? "" : "/"}${src}`;
  const img = p.heroImage || p.coverImage;
  const image = img ? [abs(img)] : [`${base}/og-image.jpg`];
  const region = p.region ? String(p.region).replaceAll("_", " ") : undefined;

  const lots = Array.isArray(p.lots) ? p.lots : [];
  const prices = lots
    .map((l: any) => (Number(l.prixPlateau) || 0) + (Number(l.prixTravaux) || 0))
    .filter((v: number) => v > 0);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ApartmentComplex",
    "@id": url,
    url,
    name: p.title,
    ...(p.intro || p.summary ? { description: p.intro || p.summary } : {}),
    image,
    ...(lots.length ? { numberOfAccommodationUnits: lots.length } : {}),
    address: {
      "@type": "PostalAddress",
      ...(p.address ? { streetAddress: p.address } : {}),
      ...(p.city ? { addressLocality: p.city } : {}),
      ...(region ? { addressRegion: region } : {}),
      addressCountry: "FR",
    },
    ...(prices.length
      ? {
          makesOffer: {
            "@type": "AggregateOffer",
            priceCurrency: "EUR",
            lowPrice: Math.min(...prices),
            highPrice: Math.max(...prices),
            offerCount: prices.length,
            url,
          },
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
