import Image from "next/image";
import Link from "next/link";
import Section from "@/components/Section";
import HeroSlideshow from "@/components/HeroSlideshow";
import PropertyCard from "@/components/PropertyCard";
import EstimationForm from "@/components/EstimationFormLazy";
import { getPropertyCards } from "@/lib/propertiesData";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agence immobilière à Rouen | Lemeille Patrimoine",
  description: "Agence immobilière à Rouen, Mont-Saint-Aignan et Bois-Guillaume. Vente de maisons et appartements de caractère, estimation gratuite sous 3 jours.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Agence immobilière à Rouen & Plateau Nord | Lemeille Patrimoine",
    description:
      "Maisons et appartements de caractère à Rouen, Mont-Saint-Aignan, Bois-Guillaume. Estimation gratuite et conseil en défiscalisation.",
    url: "/",
  },
};

// Rendu à la requête : les biens sont lus depuis le volume monté au démarrage
// (bucket GCS). En prérendu statique, ce volume n'existe pas encore au build et
// la page serait figée sans aucun bien pendant toute la fenêtre de revalidation.
export const dynamic = 'force-dynamic';

// Nombre de biens vendus / sous promesse : preuve sociale affichée sur l'accueil.
async function getSoldCount() {
  try {
    const all = await getPropertyCards();
    return all.filter((p: any) => p && (p.sold || p.status === 'SOLD' || p.status === 'UNDER_OFFER')).length;
  } catch {
    return 0;
  }
}

async function getFeatured() {
  try {
    const all = await getPropertyCards();
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
  const [featured, soldCount] = await Promise.all([getFeatured(), getSoldCount()]);
  return (
    <main>
      {/* HERO — diaporama plein cadre + CTA unique */}
      <section className="relative isolate overflow-hidden">
        <HeroSlideshow
          images={[
            { src: "/hero-normandie.jpg", alt: "Maison de caractère en Normandie, région de Rouen" },
            { src: "/hero-chaumiere.jpg", alt: "Chaumière normande traditionnelle à colombages, campagne rouennaise" },
            { src: "/hero-accueil.jpg", alt: "Immeuble haussmannien de caractère à l'heure dorée" },
          ]}
        />
        {/* Voile vert dégradé — lisibilité du texte, le vert devient un accent et non un mur */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#12241b]/90 via-[#1F3B2C]/60 to-[#1F3B2C]/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#12241b]/60 via-transparent to-transparent" />

        <div className="container relative flex min-h-[70vh] md:min-h-[80vh] flex-col justify-center py-20 md:py-28">
          <span className="text-xs md:text-sm font-medium uppercase tracking-[0.28em] text-gold">
            Rouen &amp; Plateau Nord
          </span>
          <h1 className="mt-4 text-4xl md:text-6xl luxe text-cream leading-[1.05]">
            Agence immobilière à Rouen
          </h1>
          <div className="mt-5 h-px w-16 bg-gold/70" />
          <p className="mt-6 max-w-xl text-base md:text-lg text-cream/90 leading-relaxed">
            Lemeille Patrimoine — votre agence immobilière à Rouen, Mont-Saint-Aignan, Bois-Guillaume et sur
            l&apos;ensemble du Plateau Nord. Vente de maisons et appartements de caractère, estimation gratuite
            et défiscalisation sur mesure.
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


      {/* Bandeau de réassurance — signaux de confiance (SEO local + conversion) */}
      <section className="border-b border-black/5 bg-white/70">
        <div className="container py-7 grid grid-cols-2 md:grid-cols-5 gap-y-6 gap-x-4 text-center divide-y-0 md:divide-x md:divide-black/[0.06]">
          {[
            [soldCount > 0 ? `${soldCount} ventes réalisées` : "Rouen & Plateau Nord", soldCount > 0 ? "Biens vendus ou sous promesse" : "Bureaux à Rouen et Mont-Saint-Aignan"],
            ["8 ans d'expérience", "Master école de commerce"],
            ["Carte T", "CPI 7606 2024 000 000 038"],
            ["Réponse sous 48h", "Interlocuteur unique"],
            ["Estimation gratuite", "Avis de valeur sous 3 jours"],
          ].map(([t, s], i) => (
            <div key={i} className="px-2">
              <div className="luxe text-lg md:text-xl text-luxe leading-tight">{t}</div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-luxe/70 mt-1.5">{s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Biens à la une */}
      {featured.length > 0 && (
        <Section title="Nos biens à vendre à Rouen et alentours" subtitle="Une sélection de maisons et appartements de caractère.">
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
            ["Photographie professionnelle","Boîtier hybride, ultra grand-angle et drone — vos biens présentés comme ils le méritent."],
            ["Réseau d'experts rouennais","Notaires, banques, architectes et artisans de la région."],
            ["Réactivité","Retour sous 48h, suivi jusqu'à la signature."],
            ["Expertise locale","Connaissance fine de Rouen, du Plateau Nord et de ses quartiers."]
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
      <Section title="Nos secteurs à Rouen et alentours" subtitle="Une connaissance quartier par quartier du marché rouennais.">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["Rouen centre & rive droite","Vieux-Marché, Cathédrale, Jardin des Plantes • Appartements de caractère, immeubles anciens, hôtels particuliers.","/secteurs/rouen-centre"],
            ["Plateau Nord","Mont-Saint-Aignan, Bois-Guillaume, Bihorel, Isneauville • Maisons familiales, terrains arborés, secteurs prisés.","/secteurs/mont-saint-aignan-bois-guillaume"],
            ["Rive gauche & Plateau Est","Saint-Sever, Grammont, Le Mesnil-Esnard, Franqueville • Prix d'entrée accessibles et bons rendements locatifs.","/secteurs/rouen-rive-gauche"]
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

      {/* Estimation gratuite — demande client */}
      <div id="estimation">
        <Section title="Estimez votre bien gratuitement" subtitle="Vous vendez à Rouen, Mont-Saint-Aignan ou Bois-Guillaume ? Obtenez une estimation indicative immédiate et un avis de valeur personnalisé, sans engagement.">
          <div className="max-w-3xl mx-auto">
            <EstimationForm />
          </div>
        </Section>
      </div>

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
              <strong>Arthur Lemeille</strong> est le fondateur de Lemeille Patrimoine. Formé en école de commerce — <strong>Bachelor à NEOMA Business School (Rouen)</strong> puis <strong>Master à KEDGE Business School (Bordeaux)</strong> — il totalise aujourd&apos;hui <strong>huit années d&apos;expérience commerciale</strong>. Il débute sa carrière par trois années de conseil en supply chain et logistique, qui lui transmettent le sens de la précision et la rigueur des processus. Il poursuit par le développement commercial au sein d&apos;une start-up, où il cultive le goût du terrain, de la relation et de la négociation. Il choisit ensuite de se consacrer à l&apos;immobilier de caractère et à la défiscalisation immobilière, de retour sur ses terres rouennaises.
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
    </main>
  );
}
