import Link from "next/link";
import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import Img from "@/components/Img";
import ArticleSeoJsonLd from "@/components/ArticleSeoJsonLd";
import { notFound } from "next/navigation";
import type { Metadata } from 'next';
import { seoTitle } from '@/lib/seoTitle';

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
  // Un titre d'article est long par nature : seoTitle sacrifie la marque
  // plutôt que de laisser Google couper la fin de la phrase.
  // Le titre SEO saisi en base passe par le même plafonnement : rien ne sert
  // d'écrire un titre que Google tronquera.
  const title = seoTitle([a.seoTitle || a.title]);
  const description = String(a.seoDescription || a.excerpt || '').slice(0, 158);
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
  if (!a) notFound();

  // Rendu enrichi : "## " → H2, "### " → H3, "- " → liste à puces, sinon paragraphe.
  // Le gras **texte** est également interprété à l'intérieur des lignes.
  const inline = (text: string): React.ReactNode => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
  };
  const lines = String(a.content || '').split('\n');
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flushBullets = (key: string) => {
    if (bullets.length) {
      const items = bullets;
      blocks.push(
        <ul key={`ul-${key}`} className="list-disc pl-5 space-y-1.5 marker:text-[#B89C6D]">
          {items.map((b, j) => <li key={j}>{inline(b)}</li>)}
        </ul>
      );
      bullets = [];
    }
  };
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) { flushBullets(String(i)); return; }
    if (line.startsWith('### ')) { flushBullets(String(i)); blocks.push(<h3 key={i} className="luxe text-lg text-luxe mt-5">{inline(line.slice(4))}</h3>); }
    else if (line.startsWith('## ')) { flushBullets(String(i)); blocks.push(<h2 key={i} className="luxe text-2xl text-luxe mt-7">{inline(line.slice(3))}</h2>); }
    else if (line.startsWith('- ')) { bullets.push(line.slice(2)); }
    else { flushBullets(String(i)); blocks.push(<p key={i}>{inline(line)}</p>); }
  });
  flushBullets('end');

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
        <div className="card p-6 space-y-4 leading-relaxed">
          {blocks}
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
