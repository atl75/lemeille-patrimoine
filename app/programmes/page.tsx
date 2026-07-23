import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Programmes de défiscalisation immobilière | Lemeille Patrimoine',
  description: 'Opérations dédiées à la valorisation et la défiscalisation immobilière : Loi Malraux, Monument Historique, Déficit Foncier. Paris, Normandie, Côte d\'Azur.',
  alternates: {
    canonical: '/programmes'
  },
  openGraph: {
    title: 'Programmes de défiscalisation immobilière',
    description: 'Opérations Malraux, Monument Historique, Déficit Foncier.',
    url: '/programmes',
    type: 'website',
  }
};

async function getPrograms(){
  const base = process.env.NEXT_PUBLIC_SITE_URL || `http://127.0.0.1:${process.env.PORT||'3000'}`;
  const r = await fetch(`${base}/api/programs`, { cache: 'no-store' });
  return r.ok ? r.json() : [];
}

export default async function Page(){
  const items = await getPrograms();
  return (
    <main>
      <Hero
        title="Programmes"
        subtitle="Opérations dédiées à la valorisation et la défiscalisation : Malraux, Monument Historique, Déficit Foncier."
        primary={{ label: "Nous contacter", href: "/contact" }}
      />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Programmes"}]} />
      </section>
      <section className="container pb-12">
        <div className="grid md:grid-cols-2 gap-6">
          {items.map((p:any)=>(
            <a key={p.id} className="card p-6 hover:border-[#B89C6D] transition" href={p.externalUrl || "#"} target={p.externalUrl ? "_blank" : "_self"}>
              <h2 className="luxe text-2xl">{p.title}</h2>
              <div className="opacity-70">{p.city} · {p.dispositif}</div>
              {p.summary && <p className="mt-2">{p.summary}</p>}
            </a>
          ))}
          {!items.length && <div className="opacity-70">Aucun programme pour le moment.</div>}
        </div>
      </section>
    </main>
  );
}
