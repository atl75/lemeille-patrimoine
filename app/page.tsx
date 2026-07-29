import Image from "next/image";
import Link from "next/link";
import Section from "@/components/Section";
import PropertyCard from "@/components/PropertyCard";
import HomeSeoJsonLd from "@/components/HomeSeoJsonLd";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

async function getFeatured() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || `http://127.0.0.1:${process.env.PORT || '3000'}`;
  try {
    const r = await fetch(`${base}/api/properties`, { cache: 'no-store' });
    if (!r.ok) return [];
    const all = await r.json();
    if (!Array.isArray(all)) return [];
    const available = all.filter(
      (p: any) => p && p.visible !== false && !p.sold && p.status !== 'UNDER_OFFER' && p.status !== 'SOLD'
    );
    const featured = available.filter((p: any) => p.featured);
    const list = featured.length ? featured : [...available].sort((a: any, b: any) => (b.price || 0) - (a.price || 0));
    return list.slice(0, 3);
  } catch {
    return [];
  }
}

export default async function Home() {
  const featured = await getFeatured();
  return (
    <main>
      {/* HERO vert */}
      <section className="bg-luxe text-white">
        <div className="container py-8 md:py-12 min-h-[360px] md:min-h-[380px] flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl luxe text-cream">Lemeille Patrimoine</h1>
          <p className="mt-3 max-w-2xl text-cream/90">
            Agence immobilière haut de gamme — transaction dans l&apos;ancien à Paris, en Normandie
            et sur la Côte d&apos;Azur. Défiscalisation sur mesure : Malraux, Monument Historique, Déficit Foncier.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/immobilier" className="btn btn-gold" data-testid="button-immobilier">
              Nos biens
            </Link>
            <Link href="/programmes" className="btn btn-ghost" data-testid="button-defiscalisation">
              Défiscalisation
            </Link>
          </div>
        </div>
      </section>

      {/* Biens à la une */}
      {featured.length > 0 && (
        <Section title="Nos biens à la une" subtitle="Une sélection de nos plus belles opportunités du moment.">
          <div className="grid md:grid-cols-3 gap-6">
            {featured.map((p: any, i: number) => (
              <PropertyCard
                key={p.id}
                property={p}
                cityLabel={[p.city, String(p.region || '').replaceAll('_', ' ')].filter(Boolean).join(' · ')}
                priority={i === 0}
              />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/immobilier" className="btn btn-gold inline-flex items-center gap-2" data-testid="button-featured-all">
              Voir tous nos biens
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </Section>
      )}

      {/* Engagements Immobilier */}
      <Section title="Nos engagements immobiliers" subtitle="Sélection rigoureuse, accompagnement sur-mesure, confidentialité.">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["Sélection de qualité","Biens vérifiés, diagnostics et potentiel de valorisation."],
            ["Conseil indépendant","Alignement d'intérêts, honoraires transparents."],
            ["Discrétion","Mandats off-market, confidentialité totale."],
            ["Réseau d'experts","Notaires, banques privées, architectes, entrepreneurs."],
            ["Réactivité","Retour sous 48h, suivi jusqu'à la signature."],
            ["Expertise locale","Connaissance approfondie de Paris, Normandie et Côte d'Azur."]
          ].map(([t, s], i)=>(
            <div key={i} className="card p-6">
              <div className="luxe text-xl mb-2">{t}</div>
              <p className="opacity-80">{s}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Démarche d'achat */}
      <Section title="Notre démarche d'acquisition">
        <ol className="grid md:grid-cols-4 gap-6 list-decimal pl-6">
          {[
            ["Brief & critères","Budget, localisation, surface, objectifs d'investissement."],
            ["Sélection & visites","Présentation de biens ciblés, visites accompagnées."],
            ["Négociation","Défense de vos intérêts, analyse juridique et technique."],
            ["Signature & suivi","Accompagnement notarial, financement, travaux."]
          ].map(([t,s],i)=>(
            <li key={i} className="card p-6">
              <div className="luxe text-xl mb-2">{t}</div>
              <p className="opacity-80 break-words">{s}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Secteurs */}
      <Section title="Secteurs d'intervention">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["Paris","Rive gauche, Ouest, Centre historique • Immeubles haussmanniens, hôtels particuliers, appartements familiaux.","/immobilier"],
            ["Normandie","Rouen, Mont-Saint-Aignan, Bois-Guillaume • Résidentiel recherché, maisons et appartements de caractère.","/immobilier"],
            ["Côte d'Azur","Saint-Aygulf, Fréjus, Sainte-Maxime, Estérel • Villas de standing, vue mer, environnement préservé.","/immobilier"]
          ].map(([t,s,href],i)=>(
            <Link key={i} href={href} className="card p-6 block hover:border-[#B89C6D] transition" data-testid={`link-sector-${i}`}>
              <div className="luxe text-xl mb-2">{t}</div>
              <p className="opacity-80 text-sm">{s}</p>
            </Link>
          ))}
        </div>

        {/* Bouton vers la page des biens */}
        <div className="mt-8 text-center">
          <Link
            href="/immobilier"
            className="btn btn-gold inline-flex items-center gap-2"
            data-testid="button-voir-biens"
          >
            Découvrir tous nos biens
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/>
              <path d="m12 5 7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </Section>

      {/* Défiscalisation */}
      <Section title="Défiscalisation immobilière" subtitle="Réduisez votre imposition grâce à l'immobilier ancien de caractère.">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["Loi Malraux","Réduction d'impôt jusqu'à 30% sur les travaux de restauration en secteur sauvegardé."],
            ["Monument Historique","Déduction fiscale intégrale des travaux, sans plafonnement de ressources."],
            ["Déficit Foncier","Imputation sur le revenu global jusqu'à 10 700€/an, report possible."]
          ].map(([t, s], i)=>(
            <div key={i} className="card p-6">
              <div className="luxe text-xl mb-2">{t}</div>
              <p className="opacity-80 text-sm">{s}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/programmes" className="btn btn-gold inline-flex items-center gap-2" data-testid="button-defiscalisation-plus">
            En savoir plus sur la défiscalisation
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/>
              <path d="m12 5 7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </Section>

      {/* À propos - Arthur Lemeille */}
      <Section title="Qui suis-je ?">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Photo */}
          <div className="order-2 md:order-1">
            <Image
              src="/images/arthur-lemeille.jpg"
              alt="Arthur Lemeille - Fondateur de Lemeille Patrimoine"
              width={665}
              height={998}
              sizes="(max-width: 768px) 100vw, 50vw"
              className="w-full h-auto rounded-lg shadow-lg"
              priority
              quality={85}
              data-testid="img-arthur-lemeille"
            />
          </div>

          {/* Texte */}
          <div className="order-1 md:order-2">
            <h3 className="luxe text-2xl md:text-3xl mb-4 text-luxe">Arthur Lemeille</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Arthur Lemeille</strong> est le fondateur de Lemeille Patrimoine. Il débute sa carrière par 3 ans de conseil en Supply Chain/Logistique, où il apprend la précision des processus et la culture du résultat. Il poursuit 3 ans en développement commercial au sein d&apos;une start-up, expérience qui forge son goût du terrain, de la négociation et de la création de valeur. Il se spécialise ensuite dans l&apos;immobilier et la défiscalisation immobilière.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Ce double regard, <em>transaction & optimisation fiscale</em>, lui permet d&apos;accompagner ses clients avec une approche globale : analyse, action, suivi. Son engagement tient en trois mots : <strong>proactif, actif, réactif</strong>.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Passionné d&apos;entrepreneuriat, Arthur mobilise un réseau de partenaires (notaires, banquiers, fiscalistes, artisans) pour sécuriser chaque étape, de l&apos;estimation à l&apos;arbitrage, et transforme les objectifs en décisions efficaces.
            </p>
          </div>
        </div>
      </Section>

      {/* SEO JSON-LD */}
      <HomeSeoJsonLd />
    </main>
  );
}
