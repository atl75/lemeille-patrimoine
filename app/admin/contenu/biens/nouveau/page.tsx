"use client";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import GoogleMapsScript from "@/components/GoogleMapsScript";
import FicheBienFormulaire from "@/components/admin/FicheBienFormulaire";
import { BIEN_VIERGE } from "@/lib/typesBien";

/** Création d'un bien. Le formulaire est le même qu'en modification. */
export default function Page() {
  const router = useRouter();
  const retour = () => router.push("/admin/contenu/biens");

  return (
    <AdminShell title="Biens">
      <GoogleMapsScript />
      <Breadcrumb
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Contenu", href: "/admin/contenu" },
          { label: "Biens", href: "/admin/contenu/biens" },
          { label: "Nouveau bien" },
        ]}
      />
      <h1 className="text-2xl font-semibold mb-6">Nouveau bien</h1>
      <FicheBienFormulaire bienInitial={BIEN_VIERGE} onEnregistre={retour} onAnnule={retour} />
    </AdminShell>
  );
}
