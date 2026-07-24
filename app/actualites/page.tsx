import Link from "next/link";
import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import Img from "@/components/Img";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Actualités immobilières et patrimoniales | Lemeille Patrimoine",
  description: "Analyses de marché, fiscalité (Malraux, Monument Historique, Déficit Foncier) et conseils patrimoniaux à Paris, en Normandie et sur la Côte d'Azur.",
  alternates: {
    canonical: '/actualites'
  },
  openGraph: {
    title: "Actualités immobilières et patrimoniales",
    description: "Analyses de marché, fiscalité et conseils patrimoniaux.",
    url: '/actualites',
    type: 'website',
  }
};

async function getArticles(){
  const base = process.env.NEXT_PUBLIC_SITE_URL || `http://127.0.0.1:${process.env.PORT||'3000'}`;
  const r = await fetch(`${base}/api/articles`, { cache: 'no-store' });
  const data = r.ok ? await r.json() : [];
  return Array.isArray(data)
    ? data.sort((a: any, b: any) => (a.publishedAt < b.publishedAt ? 1 : -1))
    : [];
}

export default async function Page(){
  const articles = await getArticles();
  return (
    <main>
      <Hero
        title="Actualités"
        subtitle="Marché immobilier, fiscalité et stratégie patrimoniale — Paris, Normandie, Côte d'Azur."
      />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Actualités"}]} />
      </section>
      <section className="container pb-12">
        <div className="grid md:grid-cols-2 gap-6">
          {articles.map((a: any) => (
            <Link key={a.id} href={`/actualites/${a.slug}`} className="card p-0 hover:border-[#B89C6D] transition" data-testid={`card-article-${a.id}`}>
              {a.coverImage && (
                <Img src={a.coverImage} alt={a.title} width={800} height={420} className="w-full h-48 object-cover rounded-t-2xl" />
              )}
              <div className="p-6">
                {Array.isArray(a.tags) && a.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {a.tags.slice(0, 3).map((t: string, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-2xl border bg-white/70">{t}</span>
                    ))}
                  </div>
                )}
                <h2 className="luxe text-xl">{a.title}</h2>
                <p className="mt-2 text-sm opacity-80 line-clamp-3">{a.excerpt}</p>
                <div className="mt-3 text-xs opacity-60">
                  {new Date(a.publishedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </Link>
          ))}
          {!articles.length && <div className="opacity-70">Aucun article pour le moment.</div>}
        </div>
      </section>
    </main>
  );
}
