import Link from "next/link";
import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import Img from "@/components/Img";
import ArticleSeoJsonLd from "@/components/ArticleSeoJsonLd";
import type { Metadata } from 'next';

async function getArticle(slug: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || `http://127.0.0.1:${process.env.PORT || '3000'}`;
  const r = await fetch(`${base}/api/articles`, { cache: 'no-store' });
  if (!r.ok) return null;
  const data = await r.json();
  return Array.isArray(data) ? data.find((a: any) => a.slug === slug) || null : null;
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const a = await getArticle(slug);
  if (!a) return { title: "Article introuvable | Lemeille Patrimoine" };
  const title = a.seoTitle || `${a.title} | Lemeille Patrimoine`;
  const description = a.seoDescription || a.excerpt;
  return {
    title,
    description,
    alternates: { canonical: `/actualites/${a.slug}` },
    openGraph: {
      title,
      description,
      url: `/actualites/${a.slug}`,
      type: 'article',
      images: a.coverImage ? [{ url: a.coverImage }] : undefined,
    }
  };
}

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const a = await getArticle(slug);
  if (!a) return <main className="container py-12">Article introuvable.</main>;

  const paragraphs: string[] = String(a.content || '').split(/\n+/).filter(Boolean);

  return (
    <main>
      <Hero
        title={a.title}
        subtitle={new Date(a.publishedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + (a.author ? ` · ${a.author}` : '')}
        secondary={{ label: "Toutes les actualités", href: "/actualites" }}
      />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Actualités", href:"/actualites"},{label:a.title}]} />
      </section>

      <section className="container pb-12 max-w-3xl">
        {a.coverImage && (
          <Img src={a.coverImage} alt={a.title} width={1200} height={630} className="w-full h-auto rounded-2xl mb-6" priority />
        )}
        {Array.isArray(a.tags) && a.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {a.tags.map((t: string, i: number) => (
              <span key={i} className="text-xs px-3 py-1 rounded-2xl border bg-white/70">{t}</span>
            ))}
          </div>
        )}
        <div className="card p-6 space-y-4">
          {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>

        <div className="mt-8 card p-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="luxe text-lg">Un projet immobilier ou patrimonial ?</div>
            <div className="text-sm opacity-80">Nos conseillers vous répondent sous 48h.</div>
          </div>
          <Link href="/contact" className="btn btn-gold">Nous contacter</Link>
        </div>
      </section>

      <ArticleSeoJsonLd article={a} />
    </main>
  );
}
