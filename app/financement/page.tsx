import Link from "next/link";
import Hero from "@/components/Hero";
import CapaciteEmpruntSimulator from "@/components/CapaciteEmpruntSimulator";
import Breadcrumb from "@/components/Breadcrumb";
import Section from "@/components/Section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Capacité d'emprunt : simulateur & financement à Rouen | Lemeille Patrimoine",
  description:
    "Calculez votre capacité d'emprunt et votre budget d'achat immobilier à Rouen : mensualité maximale, montant empruntable, frais de notaire. Simulateur gratuit et mise en relation avec notre courtier partenaire.",
  alternates: { canonical: "/financement" },
  openGraph: {
    title: "Simulateur de capacité d'emprunt — Lemeille Patrimoine",
    description: "Estimez votre budget d'achat immobilier à Rouen en quelques secondes.",
    url: "/financement",
  },
};

const FAQ: [string, string][] = [
  ["Comment se calcule la capacité d'emprunt ?", "Les banques appliquent un taux d'endettement maximal de 35 % des revenus nets, assurance emprunteur comprise, conformément aux recommandations du Haut Conseil de stabilité financière. On soustrait de cette mensualité maximale les crédits déjà en cours, puis on convertit le solde en capital selon la durée et le taux du prêt."],
  ["Quel apport faut-il prévoir ?", "Les banques demandent généralement de quoi couvrir les frais d'acquisition — frais de notaire et de garantie — soit environ 8 à 10 % du prix dans l'ancien. Un apport supérieur améliore les conditions obtenues, mais des dossiers sans apport restent possibles selon le profil."],
  ["Les frais de notaire sont-ils inclus dans le prêt ?", "Ils peuvent l'être, mais la plupart des banques préfèrent qu'ils soient financés par l'apport. Notre simulateur les estime à environ 7,5 % du prix du bien, taux courant dans l'ancien."],
  ["Quel taux dois-je indiquer dans le simulateur ?", "Celui que votre banque ou votre courtier vous a indiqué. Nous n'affichons volontairement aucun « taux du moment » : les conditions varient selon le profil, la durée, la banque et la période. Seul un courtier peut vous donner un chiffre fiable pour votre dossier."],
  ["Faut-il d'abord trouver le bien ou le financement ?", "Le financement, ou au moins une simulation bancaire sérieuse. Sur les secteurs tendus comme le Plateau Nord de Rouen, une offre appuyée par un accord de principe passe devant une offre équivalente sans financement validé."],
];

export default function Page() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <Hero
        title="Quel budget pour votre achat ?"
        subtitle={<span>Estimez votre capacité d&apos;emprunt en quelques secondes, avant de visiter.</span>}
        primary={{ label: "Calculer mon budget", href: "#simulateur" }}
        secondary={{ label: "Voir nos biens", href: "/immobilier" }}
        image="/hero-normandie.jpg"
      />

      <section className="container py-6">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Financement" }]} />
      </section>

      <div id="simulateur">
        <Section
          title="Simulateur de capacité d'emprunt"
          subtitle="Renseignez votre situation : le calcul applique la règle des 35 % d'endettement, assurance comprise."
        >
          <CapaciteEmpruntSimulator />
        </Section>
      </div>

      <Section title="Pourquoi connaître son budget avant de visiter">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["Vous visitez utile", "Définir son budget évite de tomber amoureux d'un bien hors de portée — et de perdre des semaines."],
            ["Vous négociez mieux", "Sur un marché tendu, un acquéreur au financement préparé passe devant une offre équivalente non validée."],
            ["Vous évitez la mauvaise surprise", "Frais de notaire, garantie, travaux : le prix affiché n'est jamais le coût réel de l'opération."],
          ].map(([t, d], i) => (
            <div key={i} className="card p-6">
              <div className="luxe text-xl mb-2">{t}</div>
              <p className="opacity-80 text-sm leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Courtier partenaire */}
      <Section title="Notre courtier partenaire" subtitle="Le financement est un métier : nous travaillons avec un spécialiste.">
        <div className="card p-6 md:p-8 max-w-3xl mx-auto">
          <div className="luxe text-2xl mb-1">Joachim Boimard</div>
          <div className="text-sm opacity-70 mb-4">Courtier en crédit immobilier</div>
          <p className="opacity-85 leading-relaxed">
            Notre simulateur donne un ordre de grandeur. Pour connaître les conditions réellement accessibles
            selon votre profil — taux, assurance, garantie, durée — nous vous mettons en relation avec
            Joachim Boimard, qui analyse votre capacité d&apos;emprunt et négocie auprès de son réseau bancaire.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/contact?topic=Financement" className="btn btn-gold">Être mis en relation</Link>
            <Link href="/partenaires" className="btn">Voir tous nos partenaires</Link>
          </div>
        </div>
      </Section>

      <Section title="Questions fréquentes sur le financement">
        <div className="grid md:grid-cols-2 gap-6">
          {FAQ.map(([q, a], i) => (
            <div key={i} className="card p-6">
              <h3 className="luxe text-lg mb-2">{q}</h3>
              <p className="opacity-80 text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
        <p className="text-xs opacity-60 text-center mt-8 max-w-3xl mx-auto">
          Les résultats de ce simulateur sont donnés à titre indicatif et ne constituent ni une offre de prêt,
          ni un accord de financement, ni un conseil en crédit. Seul un établissement prêteur ou un intermédiaire
          en opérations de banque habilité peut vous délivrer une offre.
        </p>
      </Section>
    </main>
  );
}
