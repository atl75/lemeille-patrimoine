import Link from "next/link";
import Image from "next/image";
import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import Section from "@/components/Section";
import DefiscalisationSimulator from "@/components/DefiscalisationSimulator";
import GuideDownload from "@/components/GuideDownload";
import { dispositifsOf } from "@/lib/dispositifs";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Défiscalisation immobilière — Malraux, Monument Historique | Lemeille Patrimoine',
  description: "Réduisez votre imposition grâce à l'immobilier de caractère : Loi Malraux, Monument Historique, Déficit Foncier. Sélection d'opérations et accompagnement sur mesure à Rouen et en Normandie.",
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

      {/* Nos programmes — les opérations concrètes, mises en avant en tête */}
      {items.length > 0 && (
        <Section title="Nos programmes" subtitle="Des opérations de restauration sélectionnées, éligibles aux dispositifs de défiscalisation. Découvrez le détail, les lots et l'emplacement de chacune.">
          <div className="grid md:grid-cols-2 gap-6">
            {items.map((p:any)=>{
              const href = `/programmes/${p.slug || p.id}`;
              const dispos = dispositifsOf(p).map(d => d.nom).join(" · ");
              const img = p.heroImage || p.coverImage;
              return (
                <Link key={p.id} className="card p-0 overflow-hidden hover:border-[#B89C6D] transition group" href={href}>
                  {img ? (
                    <div className="relative w-full h-48">
                      <Image src={img} alt={`Programme — ${p.title}`} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-[#1F3B2C] to-[#2e5140] flex items-center justify-center px-4 text-center">
                      <span className="text-cream/75 text-xs uppercase tracking-[0.22em]">{dispos || "Défiscalisation"}</span>
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="luxe text-2xl">{p.title}</h3>
                    <div className="opacity-70 text-sm mt-1">{p.city}{dispos ? ` · ${dispos}` : ""}</div>
                    {p.summary && <p className="mt-2 text-sm opacity-80">{p.summary}</p>}
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#B89C6D] group-hover:gap-2.5 transition-all">
                      Découvrir le programme →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      <Section
        title="Les dispositifs de défiscalisation"
        subtitle="Selon votre situation et le bien, nous mobilisons le levier le plus pertinent — de l'étude à la livraison."
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

      <Section
        title="Simulateur de défiscalisation"
        subtitle="Estimez en quelques secondes votre gain fiscal selon le dispositif. Estimation indicative — un conseiller affine ensuite selon votre situation."
      >
        <DefiscalisationSimulator />
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

      <Section
        title="Nos guides gratuits"
        subtitle="Téléchargez nos guides pour comprendre chaque dispositif : principe, conditions, avantage fiscal et points de vigilance."
      >
        <GuideDownload />
      </Section>
    </main>
  );
}
