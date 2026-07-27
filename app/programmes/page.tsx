import Link from "next/link";
import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import Section from "@/components/Section";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Défiscalisation immobilière — Malraux, Monument Historique | Lemeille Patrimoine',
  description: "Réduisez votre imposition grâce à l'immobilier de caractère : Loi Malraux, Monument Historique, Déficit Foncier. Sélection d'opérations et accompagnement sur mesure à Paris, en Normandie et sur la Côte d'Azur.",
  alternates: {
    canonical: '/programmes'
  },
  openGraph: {
    title: 'Défiscalisation immobilière — Malraux, Monument Historique, Déficit Foncier',
    description: "Réduisez votre imposition grâce à l'immobilier ancien de caractère. Accompagnement sur mesure.",
    url: '/programmes',
    type: 'website',
  }
};

async function getPrograms(){
  const base = process.env.NEXT_PUBLIC_SITE_URL || `http://127.0.0.1:${process.env.PORT||'3000'}`;
  const r = await fetch(`${base}/api/programs`, { cache: 'no-store' });
  return r.ok ? r.json() : [];
}

const DISPOSITIFS = [
  {
    nom: "Loi Malraux",
    accroche: "Jusqu'à 30 % de réduction d'impôt sur les travaux de restauration.",
    detail:
      "La Loi Malraux s'adresse aux contribuables fortement imposés qui investissent dans la restauration d'un immeuble ancien situé en secteur sauvegardé ou site patrimonial remarquable. La réduction d'impôt atteint 22 % à 30 % du montant des travaux (plafonnés à 400 000 € sur quatre ans), hors plafonnement global des niches fiscales. En contrepartie, le bien restauré doit être loué nu à usage d'habitation pendant au moins neuf ans.",
  },
  {
    nom: "Monument Historique",
    accroche: "Déduction intégrale des travaux, sans plafond de ressources.",
    detail:
      "Le régime Monument Historique permet de déduire de son revenu global la totalité des charges et des travaux de restauration d'un bien classé ou inscrit, sans plafonnement et sans limite de montant. C'est l'un des dispositifs les plus puissants pour les hauts revenus, particulièrement adapté aux immeubles de prestige. L'engagement de conservation du bien est de quinze ans.",
  },
  {
    nom: "Déficit Foncier",
    accroche: "Imputez vos travaux sur votre revenu, jusqu'à 10 700 €/an.",
    detail:
      "Le Déficit Foncier permet de déduire les travaux de rénovation d'un bien locatif ancien de vos revenus fonciers, puis de votre revenu global à hauteur de 10 700 € par an, l'excédent étant reportable. C'est un levier simple et efficace pour réduire l'imposition tout en valorisant un bien destiné à la location nue.",
  },
];

export default async function Page(){
  const items = await getPrograms();
  return (
    <main>
      <Hero
        title="Défiscalisation"
        subtitle="Réduisez votre imposition grâce à l'immobilier ancien de caractère : Malraux, Monument Historique, Déficit Foncier."
        primary={{ label: "Étudier mon projet", href: "/contact?topic=Défiscalisation" }}
      />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Défiscalisation"}]} />
      </section>

      <Section
        title="Transformer l'impôt en patrimoine"
        subtitle="Nous sélectionnons des opérations de restauration dans l'ancien qui allient qualité architecturale, emplacement et avantage fiscal, et nous vous accompagnons de l'étude à la livraison."
      >
        <div className="grid md:grid-cols-3 gap-6">
          {DISPOSITIFS.map((d) => (
            <div key={d.nom} className="card p-6">
              <h3 className="luxe text-xl mb-1">{d.nom}</h3>
              <p className="text-sm font-medium text-[#B89C6D] mb-3">{d.accroche}</p>
              <p className="text-sm opacity-80">{d.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Notre accompagnement">
        <ol className="grid md:grid-cols-4 gap-6 list-decimal pl-6">
          {[
            ["Bilan & objectifs", "Analyse de votre situation fiscale et patrimoniale, définition de la stratégie adaptée."],
            ["Sélection d'opération", "Choix d'un bien de qualité au bon emplacement, montage juridique et fiscal vérifié."],
            ["Financement & acquisition", "Mise en relation avec nos partenaires bancaires, accompagnement notarial."],
            ["Suivi jusqu'à la livraison", "Suivi du chantier de restauration et mise en location du bien."],
          ].map(([t,s],i)=>(
            <li key={i} className="card p-6">
              <div className="luxe text-lg mb-2">{t}</div>
              <p className="opacity-80 text-sm break-words">{s}</p>
            </li>
          ))}
        </ol>
      </Section>

      {items.length > 0 && (
        <Section title="Opérations en cours">
          <div className="grid md:grid-cols-2 gap-6">
            {items.map((p:any)=>{
              const hasUrl = typeof p.externalUrl === "string" && /^https?:\/\//.test(p.externalUrl);
              const Card = (
                <>
                  {p.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.coverImage} alt={`Programme — ${p.title}`} className="w-full h-48 object-cover rounded-xl mb-4" />
                  )}
                  <h3 className="luxe text-2xl">{p.title}</h3>
                  <div className="opacity-70">{p.city} · {p.dispositif}</div>
                  {p.summary && <p className="mt-2">{p.summary}</p>}
                </>
              );
              return hasUrl ? (
                <a key={p.id} className="card p-6 hover:border-[#B89C6D] transition" href={p.externalUrl} target="_blank" rel="noopener noreferrer">{Card}</a>
              ) : (
                <div key={p.id} className="card p-6">{Card}</div>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Envie d'optimiser votre fiscalité ?">
        <div className="card p-6 flex flex-wrap items-center justify-between gap-3">
          <p className="opacity-80 max-w-xl">
            Chaque situation est unique. Nos conseillers étudient votre profil et vous orientent vers le dispositif le plus pertinent, sans engagement.
          </p>
          <Link href="/contact?topic=Défiscalisation" className="btn btn-gold">Prendre contact</Link>
        </div>
      </Section>
    </main>
  );
}
