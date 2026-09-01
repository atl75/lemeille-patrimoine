import Link from "next/link";
import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import Section from "@/components/Section";
import EstimationForm from "@/components/EstimationFormLazy";
import { getPropertyCards } from "@/lib/propertiesData";
import type { Metadata } from "next";

// Chiffre annoncé, aligné sur l'accueil — voir app/page.tsx.
const VENTES_REALISEES = '50+';

export const metadata: Metadata = {
  title: "Vendre son bien à Rouen | Lemeille Patrimoine",
  description: "Vendre votre maison ou appartement à Rouen et sur le Plateau Nord : estimation gratuite sous 3 jours, photos professionnelles, accompagnement complet.",
  alternates: { canonical: "/vendre" },
  openGraph: {
    title: "Vendre son bien à Rouen — estimation gratuite",
    description:
      "Estimation gratuite et avis de valeur sous 3 jours pour votre maison ou appartement à Rouen et sur le Plateau Nord.",
    url: "/vendre",
  },
};

// Rendu à la requête : lecture des biens depuis le volume monté au démarrage.
export const dynamic = "force-dynamic";

async function getSoldCount() {
  try {
    const all = await getPropertyCards();
    return all.filter((p: any) => p && (p.sold || p.status === "SOLD" || p.status === "UNDER_OFFER")).length;
  } catch {
    return 0;
  }
}

const ETAPES: [string, string][] = [
  ["1. Estimation", "Visite du bien, analyse des ventes réelles du quartier et remise d'un avis de valeur argumenté sous 3 jours."],
  ["2. Mise en valeur", "Reportage photo soigné, description travaillée, plans et diagnostics réunis avant la mise en ligne."],
  ["3. Diffusion ciblée", "Publication sur les grands portails, notre site et notre fichier d'acquéreurs qualifiés — ou en off-market si vous préférez la discrétion."],
  ["4. Visites & retours", "Visites accompagnées, filtrage des candidats et compte rendu après chaque visite."],
  ["5. Négociation", "Analyse des offres, vérification de la solvabilité et du financement, défense de votre prix."],
  ["6. Jusqu'à la signature", "Constitution du dossier notaire, suivi du compromis et de l'acte authentique, sans que vous ayez à relancer."],
];

const FAQ: [string, string][] = [
  ["Combien coûte l'estimation ?", "Rien. L'estimation et l'avis de valeur sont gratuits et sans engagement, que vous vendiez avec nous ou non."],
  ["En combien de temps ai-je mon avis de valeur ?", "Sous 3 jours après la visite du bien. Vous obtenez immédiatement une fourchette indicative en ligne."],
  ["Quels sont vos honoraires ?", "Ils sont dégressifs selon le prix du bien et annoncés à l'avance, par écrit, dans le mandat. Notre barème est public sur le site."],
  ["Puis-je vendre sans que l'annonce soit publiée ?", "Oui. Nous pratiquons la vente off-market : le bien n'est présenté qu'à notre fichier d'acquéreurs, en toute confidentialité."],
  ["Sur quel secteur intervenez-vous ?", "Rouen et sa métropole : Rouen centre et rive gauche, Mont-Saint-Aignan, Bois-Guillaume, Bihorel, Isneauville, Le Mesnil-Esnard, Franqueville-Saint-Pierre et les communes voisines."],
];

export default async function Page() {
  const soldCount = await getSoldCount();
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <Hero
        title="Vendre votre bien à Rouen"
        subtitle={<span>Estimation gratuite, avis de valeur sous 3 jours et accompagnement jusqu&apos;à la signature.</span>}
        primary={{ label: "Estimer mon bien", href: "#estimation" }}
        secondary={{ label: "Parler à un conseiller", href: "/contact?topic=Vendre" }}
        image="/hero-normandie.jpg"
      />

      <section className="container py-6">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Vendre à Rouen" }]} />
      </section>

      {/* Réassurance */}
      <section className="border-y border-black/5 bg-white/70">
        <div className="container py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            [`${soldCount > 50 ? soldCount : VENTES_REALISEES} ventes réalisées`, "Rouen & Plateau Nord"],
            ["Avis de valeur sous 3 jours", "Gratuit et sans engagement"],
            ["Honoraires transparents", "Barème public, annoncés par écrit"],
            ["Interlocuteur unique", "Réponse sous 48h"],
          ].map(([t, s], i) => (
            <div key={i}>
              <div className="luxe text-base md:text-lg text-luxe">{t}</div>
              <div className="text-xs opacity-70 mt-0.5">{s}</div>
            </div>
          ))}
        </div>
      </section>

      <Section
        title="Pourquoi nous confier la vente de votre bien"
        subtitle="Une agence rouennaise, un seul interlocuteur, une méthode claire du premier rendez-vous à l'acte authentique."
      >
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["Le juste prix, pas le prix flatteur", "Un bien surévalué se vend mal et se déprécie. Notre avis de valeur s'appuie sur les ventes réellement signées dans votre quartier, pas sur les prix affichés."],
            ["Connaissance fine du Plateau Nord", "Bois-Guillaume, Mont-Saint-Aignan, Bihorel, Isneauville : les écarts de prix se jouent parfois d'une rue à l'autre. Nous connaissons ces micro-secteurs."],
            ["Des acquéreurs déjà qualifiés", "Nous présentons votre bien à un fichier d'acheteurs suivis, dont le budget et le financement sont vérifiés avant la visite."],
            ["Discrétion possible", "Vente off-market : votre bien n'est jamais publié, seuls des acquéreurs ciblés le découvrent."],
            ["Un dossier complet dès le départ", "Diagnostics, plans, règlement de copropriété, PV d'assemblée : réunis en amont pour éviter les surprises et accélérer le compromis."],
            ["Photographie professionnelle incluse", "Boîtier hybride, objectif ultra grand-angle et prises de vue par drone — pas un smartphone. C'est ce qui déclenche les visites."],
            ["Suivi jusqu'à la signature", "Compte rendu après chaque visite, coordination avec les notaires et suivi du financement de l'acquéreur."],
          ].map(([t, d], i) => (
            <div key={i} className="card p-6">
              <div className="luxe text-xl mb-2">{t}</div>
              <p className="opacity-80 text-sm leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </Section>


      {/* Photographie — différenciateur concret */}
      <Section
        title="La photo n'est pas un détail : c'est le premier filtre"
        subtitle="Un acquéreur décide en quelques secondes, sur des images, s'il visite ou non votre bien."
      >
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <p className="opacity-85 leading-relaxed mb-4">
              La quasi-totalité des acheteurs découvre un bien sur un écran avant de le voir en vrai. À ce
              stade, ils n&apos;évaluent pas votre maison : ils évaluent <em>ses photos</em>. Un intérieur mal
              cadré, une pièce qui paraît étroite, une lumière jaune ou un ciel brûlé, et le bien est écarté —
              sans qu&apos;on sache jamais qu&apos;il l&apos;a été.
            </p>
            <p className="opacity-85 leading-relaxed mb-4">
              C&apos;est pourquoi nous photographions avec du matériel professionnel plutôt qu&apos;avec un
              téléphone. Trois différences concrètes :
            </p>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <span className="text-[#B89C6D] mt-0.5">✓</span>
                <span><strong>Les pièces paraissent à leur vraie taille.</strong> Un objectif ultra grand-angle
                embrasse une chambre entière depuis l&apos;encoignure, là où un téléphone oblige à reculer contre
                un mur et déforme les perspectives.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#B89C6D] mt-0.5">✓</span>
                <span><strong>La lumière est fidèle, grâce au bracketing.</strong> Chaque cadrage est
                photographié en trois expositions — une standard, une sous-exposée pour préserver la lumière
                des fenêtres, une surexposée pour révéler les zones d&apos;ombre — puis fusionnées en une
                seule image. Résultat : on voit à la fois l&apos;intérieur <em>et</em> le paysage au dehors,
                au lieu d&apos;un mur noir ou d&apos;une vitre blanche. C&apos;est précisément ce
                qu&apos;un téléphone ne sait pas faire dans une pièce à fort contre-jour.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#B89C6D] mt-0.5">✓</span>
                <span><strong>Le bien est situé dans son environnement.</strong> Les prises de vue aériennes
                montrent le terrain, l&apos;exposition, le calme et les alentours — ce qu&apos;aucune photo au sol
                ne peut restituer.</span>
              </li>
            </ul>
            <p className="opacity-85 leading-relaxed mt-4">
              Ce travail est inclus dans notre mandat, sans supplément.
            </p>
          </div>

          <div className="card p-6">
            <div className="luxe text-xl mb-1">Notre matériel et notre méthode</div>
            <p className="text-xs opacity-70 mb-4">Le matériel ne suffit pas : c&apos;est la technique de prise de vue qui fait la différence.</p>
            <ul className="space-y-4 text-sm">
              {[
                ["Boîtier Canon EOS R50", "Hybride APS-C 24 Mpx, autofocus Dual Pixel CMOS, rafale 15 im/s, vidéo 4K/30p."],
                ["Objectif Canon RF-S 10-18 mm f/4,5-6,3 IS STM", "Ultra grand-angle stabilisé : restitue les volumes réels des pièces, même exiguës."],
                ["Drone DJI Mini 3", "Vues aériennes : implantation du bien, terrain, exposition et environnement."],
                ["Trépied K&F", "Poses longues et cadrages parfaitement d'aplomb — les lignes verticales restent droites."],
                ["Prise de vue en bracketing", "Trois expositions par cadrage — standard, sous-exposée, surexposée — fusionnées ensuite : intérieurs et vues par les fenêtres restent nets et lisibles sur la même image."],
                ["Photoshop & Luminar Neo", "Fusion des expositions et retouche mesurée : correction des perspectives, équilibrage de la lumière, ciels réalistes. Jamais de transformation du bien."],
              ].map(([t, d], i) => (
                <li key={i}>
                  <div className="font-semibold text-[#1F3B2C]">{t}</div>
                  <div className="opacity-75 mt-0.5">{d}</div>
                </li>
              ))}
            </ul>
            <p className="text-xs opacity-75 mt-5">
              Nous retouchons la lumière et les perspectives, jamais la réalité du bien : une photo qui promet
              ce que la visite ne tient produit des visites inutiles et des acquéreurs déçus.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Comment se déroule la vente" subtitle="Six étapes, un interlocuteur unique.">
        <ol className="grid md:grid-cols-3 gap-6">
          {ETAPES.map(([t, d], i) => (
            <li key={i} className="card p-6">
              <div className="luxe text-xl mb-2">{t}</div>
              <p className="opacity-80 text-sm leading-relaxed">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Estimation */}
      <div id="estimation">
        <Section
          title="Estimez votre bien gratuitement"
          subtitle="Obtenez immédiatement une fourchette indicative, puis un avis de valeur personnalisé sous 3 jours."
        >
          <div className="max-w-3xl mx-auto">
            <EstimationForm />
          </div>
        </Section>
      </div>

      {/* FAQ */}
      <Section title="Questions fréquentes des vendeurs">
        <div className="grid md:grid-cols-2 gap-6">
          {FAQ.map(([q, a], i) => (
            <div key={i} className="card p-6">
              <h3 className="luxe text-lg mb-2">{q}</h3>
              <p className="opacity-80 text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/contact?topic=Vendre" className="btn btn-gold">Parler à un conseiller</Link>
        </div>
      </Section>
    </main>
  );
}
