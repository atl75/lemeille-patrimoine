"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import FicheBienApercu from "@/components/admin/FicheBienApercu";
import { propertyLabel } from "@/lib/propertyLabel";
import type { Bien } from "@/lib/typesBien";

/**
 * Fiche d'un bien, à sa propre adresse.
 *
 * Première tranche du découpage de app/admin/contenu/biens/page.tsx, qui
 * embarquait la liste, l'aperçu et le formulaire d'édition en 2 227 lignes.
 * L'aperçu est parti dans components/admin/FicheBienApercu et sert aux deux
 * endroits ; le formulaire d'édition suivra.
 *
 * Ce que la page dédiée apporte tout de suite : une URL par bien, donc un lien
 * que l'on peut mettre en favori, envoyer, ou rouvrir après un rafraîchissement
 * — ce que le panneau dépliant de la liste ne permettait pas.
 *
 * Une seule fiche est chargée, pas les vingt-neuf.
 */
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [bien, setBien] = useState<Bien | null>(null);
  const [etat, setEtat] = useState<"chargement" | "ok" | "introuvable" | "erreur">("chargement");

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const r = await fetch(`/api/properties/${encodeURIComponent(id)}`, { cache: "no-store" });
        if (annule) return;
        if (r.status === 404) return setEtat("introuvable");
        if (!r.ok) return setEtat("erreur");
        setBien(await r.json());
        setEtat("ok");
      } catch {
        if (!annule) setEtat("erreur");
      }
    })();
    return () => {
      annule = true;
    };
  }, [id]);

  const titre = bien ? propertyLabel(bien as any, { withPrice: false }) : "Bien";

  return (
    <AdminShell title="Biens">
      <Breadcrumb
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Contenu", href: "/admin/contenu" },
          { label: "Biens", href: "/admin/contenu/biens" },
          { label: etat === "ok" ? titre : "…" },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{etat === "ok" ? titre : "Fiche du bien"}</h1>
        <Link
          href="/admin/contenu/biens"
          className="px-4 py-2 border rounded hover:bg-gray-50"
          data-testid="link-retour-liste"
        >
          ← Retour à la liste
        </Link>
      </div>

      {etat === "chargement" && <p className="opacity-70">Chargement…</p>}

      {etat === "introuvable" && (
        <div className="card p-6">
          <p className="font-medium">Ce bien n’existe pas, ou plus.</p>
          <p className="mt-2 text-sm opacity-70">
            L’identifiant <code>{id}</code> ne correspond à aucune fiche. Il a pu être supprimé
            depuis que le lien a été copié.
          </p>
        </div>
      )}

      {etat === "erreur" && (
        <div className="card p-6">
          <p className="font-medium">La fiche n’a pas pu être chargée.</p>
          <p className="mt-2 text-sm opacity-70">
            Vérifiez que votre session admin est toujours ouverte, puis rechargez la page.
          </p>
        </div>
      )}

      {etat === "ok" && bien && <FicheBienApercu bien={bien} />}
    </AdminShell>
  );
}
