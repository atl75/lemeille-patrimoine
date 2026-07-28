import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Questions fréquentes | Lemeille Patrimoine",
  description:
    "Achat, vente, défiscalisation, honoraires : les réponses aux questions les plus fréquentes sur l'accompagnement immobilier et patrimonial de Lemeille Patrimoine.",
  alternates: { canonical: "/faq" },
};

type QA = { q: string; a: string };
type Cat = { titre: string; items: QA[] };

const FAQ: Cat[] = [
  {
    titre: "Achat & recherche de biens",
    items: [
      {
        q: "Comment se déroule un accompagnement à l'achat ?",
        a: "Nous débutons par un brief précis de vos critères (budget, localisation, objectifs), puis nous sélectionnons des biens ciblés, organisons les visites, défendons vos intérêts lors de la négociation et vous accompagnons jusqu'à la signature chez le notaire.",
      },
      {
        q: "Proposez-vous des biens off-market ?",
        a: "Oui. Une partie de nos mandats est confidentielle et n'est pas diffusée publiquement. En vous inscrivant à notre alerte nouveaux biens, vous recevez ces opportunités en avant-première.",
      },
      {
        q: "Sur quels secteurs intervenez-vous ?",
        a: "Nous intervenons à Paris, en Normandie (Rouen, Mont-Saint-Aignan, Bois-Guillaume) et sur la Côte d'Azur (Fréjus, Sainte-Maxime, golfe de Saint-Tropez, Estérel).",
      },
    ],
  },
  {
    titre: "Vente & estimation",
    items: [
      {
        q: "Comment estimez-vous mon bien ?",
        a: "Nous réalisons une estimation fondée sur les caractéristiques du bien, les références de ventes récentes et la dynamique du marché local. Vous pouvez obtenir une première évaluation gratuite et sans engagement via notre page estimation.",
      },
      {
        q: "Quels sont vos honoraires ?",
        a: "Notre barème est simple et transparent : honoraires fixes de 7 500 € pour les biens jusqu'à 150 000 €, et 5 % au-delà. Le détail figure sur notre page barème d'honoraires.",
      },
      {
        q: "Vos honoraires sont-ils à charge vendeur ou acquéreur ?",
        a: "Nos honoraires sont à charge acquéreur. Ce choix permet à l'acheteur de réduire ses frais de notaire, calculés sur le prix net vendeur.",
      },
    ],
  },
  {
    titre: "Défiscalisation",
    items: [
      {
        q: "Quels dispositifs de défiscalisation proposez-vous ?",
        a: "Nous accompagnons principalement les dispositifs Malraux, Monument Historique et Déficit Foncier, adossés à des opérations de restauration dans l'ancien de caractère. Notre simulateur en ligne vous en donne une première estimation.",
      },
      {
        q: "Êtes-vous habilités à conseiller en investissement ?",
        a: "Oui. Arthur Lemeille est conseiller en investissements financiers (CIF), immatriculé à l'ORIAS sous le n° 23 003 614 et membre de l'ANACOFI-CIF. Notre activité est soumise au contrôle de l'AMF.",
      },
      {
        q: "Comment savoir si un dispositif est adapté à ma situation ?",
        a: "Chaque situation est unique. Après une première estimation via notre simulateur, nous réalisons une étude personnalisée de votre situation fiscale et patrimoniale pour vous orienter vers le dispositif le plus pertinent.",
      },
    ],
  },
  {
    titre: "Nous contacter",
    items: [
      {
        q: "Sous quel délai obtient-on une réponse ?",
        a: "Nos conseillers vous répondent sous 48h. Vous pouvez nous joindre par téléphone au 06 87 15 72 59, par email ou via le formulaire de contact.",
      },
    ],
  },
];

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.flatMap((c) =>
      c.items.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.a },
      }))
    ),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Hero
        title="Questions fréquentes"
        subtitle="Achat, vente, défiscalisation, honoraires — l'essentiel pour bien démarrer votre projet."
        primary={{ label: "Nous contacter", href: "/contact" }}
      />
      <section className="container py-6">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "FAQ" }]} />
      </section>

      <section className="container pb-14">
        <div className="grid gap-8 max-w-3xl">
          {FAQ.map((cat) => (
            <div key={cat.titre}>
              <h2 className="luxe text-2xl mb-3">{cat.titre}</h2>
              <div className="grid gap-3">
                {cat.items.map((it, i) => (
                  <details key={i} className="card p-5">
                    <summary className="font-semibold cursor-pointer text-[#1F3B2C]">{it.q}</summary>
                    <p className="mt-3 text-sm opacity-85 leading-relaxed">{it.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 card p-6 max-w-3xl">
          <p className="opacity-85">
            Vous ne trouvez pas votre réponse ?{" "}
            <Link href="/contact" className="text-[#B89C6D] underline">Contactez-nous</Link> — nos conseillers vous répondent sous 48h.
          </p>
        </div>
      </section>
    </main>
  );
}
