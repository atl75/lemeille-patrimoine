"use client";

import { useEffect } from "react";
import Link from "next/link";
import Hero from "@/components/Hero";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Journaliser l'erreur pour le suivi (visible dans les logs Cloud Run)
    console.error(error);
  }, [error]);

  return (
    <main>
      <Hero
        title="Une erreur est survenue"
        subtitle="Un problème technique a interrompu le chargement de cette page. Vous pouvez réessayer."
      />
      <section className="container py-10 flex flex-wrap items-center gap-4">
        <button onClick={() => reset()} className="btn btn-gold">
          Réessayer
        </button>
        <Link href="/" className="underline hover:text-[#B89C6D]">
          Retour à l&apos;accueil
        </Link>
      </section>
    </main>
  );
}
