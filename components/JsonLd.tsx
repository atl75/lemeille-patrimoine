import { serializeJsonLd } from '@/lib/jsonLd';

/** Point de sortie unique des données structurées publiques. */
export default function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
