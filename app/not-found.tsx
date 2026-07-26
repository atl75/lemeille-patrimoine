import Hero from "@/components/Hero";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page introuvable | Lemeille Patrimoine",
};

export default function NotFound() {
  return (
    <main>
      <Hero
        title="Page introuvable"
        subtitle="La page que vous recherchez n'existe pas ou a été déplacée."
        primary={{ label: "Retour à l'accueil", href: "/" }}
        secondary={{ label: "Voir nos biens", href: "/immobilier" }}
      />
      <section className="container py-10">
        <p className="text-black/70">
          Erreur 404. Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, vous pouvez{" "}
          <a href="/contact" className="underline hover:text-[#B89C6D]">nous contacter</a>.
        </p>
      </section>
    </main>
  );
}
