import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nos partenaires | Lemeille Patrimoine",
  description:
    "Notaire, architecte, courtier : découvrez le réseau de partenaires de confiance qui sécurise et optimise chaque étape de votre projet immobilier et patrimonial.",
  alternates: { canonical: "/partenaires" },
};

type Partner = {
  name: string;
  role: string;
  description: string;
};

const PARTNERS: Partner[] = [
  {
    name: "Hervé Guéroult",
    role: "Notaire",
    description:
      "Sécurise juridiquement chaque transaction : rédaction et authentification des actes, conseil patrimonial, fiscal et successoral. Un interlocuteur de confiance pour donner à votre projet toute sa solidité.",
  },
  {
    name: "Louise Rosant",
    role: "Architecte",
    description:
      "Accompagne la rénovation et la valorisation des biens : études de faisabilité, dépôt de permis, direction de travaux. Une expertise précieuse pour les opérations de restauration et de défiscalisation (Malraux, Monument Historique).",
  },
  {
    name: "Joachim Boimard",
    role: "Courtier",
    description:
      "Optimise le financement de votre acquisition : analyse de votre capacité d'emprunt et négociation des meilleures conditions de prêt et d'assurance auprès de son réseau bancaire.",
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Page() {
  return (
    <main>
      <Hero
        title="Nos partenaires"
        subtitle="Un réseau de professionnels de confiance pour sécuriser et optimiser chaque étape de votre projet."
        primary={{ label: "Nous contacter", href: "/contact" }}
      />
      <section className="container py-6">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Partenaires" }]} />
      </section>

      <section className="container pb-6">
        <p className="opacity-85 leading-relaxed max-w-3xl">
          Un projet immobilier ou patrimonial réussi repose sur bien plus qu&apos;une transaction. Nous nous entourons de
          partenaires reconnus — notaire, architecte, courtier — pour vous accompagner de bout en bout, avec la même
          exigence de qualité et de discrétion.
        </p>
      </section>

      <section className="container pb-14">
        <div className="grid md:grid-cols-3 gap-6">
          {PARTNERS.map((p) => (
            <div key={p.name} className="card p-6 flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className="shrink-0 w-16 h-16 rounded-full border-2 border-[#B89C6D] flex items-center justify-center">
                  <span className="luxe text-xl text-[#8A6D3F]">{initials(p.name)}</span>
                </div>
                <div>
                  <h2 className="luxe text-xl leading-tight">{p.name}</h2>
                  <span className="inline-block mt-1 text-xs font-semibold uppercase tracking-wide text-[#B89C6D]">
                    {p.role}
                  </span>
                </div>
              </div>
              <p className="text-sm opacity-85 leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 card p-6 text-center">
          <p className="opacity-85">
            Vous souhaitez être accompagné par notre réseau d&apos;experts ?{" "}
            <Link href="/contact" className="text-[#B89C6D] underline">Parlons de votre projet.</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
