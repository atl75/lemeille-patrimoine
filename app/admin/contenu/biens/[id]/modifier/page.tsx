"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import GoogleMapsScript from "@/components/GoogleMapsScript";
import FicheBienFormulaire from "@/components/admin/FicheBienFormulaire";
import { propertyLabel } from "@/lib/propertyLabel";
import type { Bien } from "@/lib/typesBien";

/**
 * Modification d'un bien, à sa propre adresse.
 *
 * Une seule fiche est chargée. La liste n'est plus en mémoire pendant qu'on
 * édite, et l'adresse peut être mise en favori ou rouverte telle quelle.
 */
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
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
    return () => { annule = true; };
  }, [id]);

  const retour = () => router.push("/admin/contenu/biens");
  const titre = bien ? propertyLabel(bien as any, { withPrice: false }) : "Bien";

  return (
    <AdminShell title="Biens">
      <GoogleMapsScript />
      <Breadcrumb
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Contenu", href: "/admin/contenu" },
          { label: "Biens", href: "/admin/contenu/biens" },
          { label: etat === "ok" ? titre : "…", href: `/admin/contenu/biens/${id}` },
          { label: "Modifier" },
        ]}
      />
      <h1 className="text-2xl font-semibold mb-6">
        {etat === "ok" ? `Modifier — ${titre}` : "Modifier le bien"}
      </h1>

      {etat === "chargement" && <p className="opacity-70">Chargement…</p>}
      {etat === "introuvable" && (
        <div className="card p-6">
          <p className="font-medium">Ce bien n’existe pas, ou plus.</p>
        </div>
      )}
      {etat === "erreur" && (
        <div className="card p-6">
          <p className="font-medium">La fiche n’a pas pu être chargée.</p>
          <p className="mt-2 text-sm opacity-70">Vérifiez votre session admin, puis rechargez.</p>
        </div>
      )}
      {etat === "ok" && bien && (
        <FicheBienFormulaire bienInitial={bien} onEnregistre={retour} onAnnule={retour} />
      )}
    </AdminShell>
  );
}
