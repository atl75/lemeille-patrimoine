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
      {/* HERO — photo plein cadre + CTA unique */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/hero-accueil.jpg"
          alt="Immeuble haussmannien de caractère à l'heure dorée"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Voile vert dégradé — lisibilité du texte, le vert devient un accent et non un mur */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#12241b]/90 via-[#1F3B2C]/60 to-[#1F3B2C]/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#12241b]/60 via-transparent to-transparent" />

        <div className="container relative flex min-h-[70vh] md:min-h-[80vh] flex-col justify-center py-20 md:py-28">
          <span className="text-xs md:text-sm font-medium uppercase tracking-[0.28em] text-gold">
            Immobilier de caractère
          </span>
          <h1 className="mt-4 text-5xl md:text-7xl luxe text-cream leading-[1.03]">
            Lemeille Patrimoine
          </h1>
          <div className="mt-5 h-px w-16 bg-gold/70" />
          <p className="mt-6 max-w-xl text-base md:text-lg text-cream/90 leading-relaxed">
            Agence spécialisée dans l&apos;immobilier de caractère — transaction dans l&apos;ancien à Paris,
            en Normandie et sur la Côte d&apos;Azur. Défiscalisation sur mesure : Malraux, Monument Historique, Déficit Foncier.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
            <Link href="/immobilier" className="btn btn-gold" data-testid="button-immobilier">
              Découvrir nos biens
            </Link>
            <Link
              href="/programmes"
              className="group inline-flex items-center gap-1.5 font-medium text-cream/90 hover:text-cream transition-colors"
              data-testid="button-defiscalisation"
            >
              Explorer la défiscalisation
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
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
              <strong>Arthur Lemeille</strong> est le fondateur de Lemeille Patrimoine. Il débute sa carrière par trois années de conseil en supply chain et logistique, qui lui transmettent le sens de la précision et la rigueur des processus. Il poursuit avec trois ans de développement commercial au sein d&apos;une start-up, où il cultive le goût du terrain, de la relation et de la négociation. Il choisit ensuite de se consacrer à l&apos;immobilier de caractère et à la défiscalisation immobilière.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              De ce double parcours naît une approche à la fois humaine et rigoureuse, à la croisée de la <em>transaction et de l&apos;optimisation fiscale</em>. Arthur accompagne chaque client de bout en bout — écoute, analyse, action et suivi — avec la même exigence : rester <strong>proactif, actif et réactif</strong> à chaque étape.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Passionné d&apos;entrepreneuriat, il s&apos;appuie sur un réseau de partenaires de confiance — notaires, banquiers, fiscalistes, artisans — pour sécuriser chaque étape, de l&apos;estimation à l&apos;arbitrage, et transformer sereinement les objectifs de ses clients en décisions justes.
            </p>
          </div>
        </div>
      </Section>

      {/* SEO JSON-LD */}
      <HomeSeoJsonLd />
    </main>
  );
}
