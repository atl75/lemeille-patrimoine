type Article = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage?: string;
  author?: string;
  publishedAt: string;
};

export default function ArticleSeoJsonLd({ article }: { article: Article }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://lemeillepatrimoine.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt,
    // image requise par Google pour un Article : couverture de l'article,
    // sinon repli sur l'image Open Graph du site.
    image: [article.coverImage || `${base}/og-image.jpg`],
    author: { "@type": "Person", name: article.author || "Arthur Lemeille" },
    publisher: { "@type": "Organization", name: "Lemeille Patrimoine", logo: { "@type": "ImageObject", url: `${base}/logo.png` } },
    datePublished: article.publishedAt,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${base}/actualites/${article.slug}` }
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}
