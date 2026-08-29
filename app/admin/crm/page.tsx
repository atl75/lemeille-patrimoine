"use client";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import Link from "next/link";
import { useEffect, useState } from "react";

type Lead = { category?: string; role?: string };

export default function Page() {
  const [leads, setLeads] = useState<Lead[]>([]);
  useEffect(() => {
    fetch("/api/leads").then(r => r.json()).then(d => setLeads(Array.isArray(d) ? d : [])).catch(() => setLeads([]));
  }, []);

  const immo = leads.filter(l => (l.category || "immobilier") === "immobilier");
  const acheteurs = immo.filter(l => (l.role || "ACHETEUR") === "ACHETEUR").length;
  const vendeurs = immo.filter(l => (l.role || "ACHETEUR") === "VENDEUR").length;
  const patrimoine = leads.filter(l => l.category === "patrimoine").length;

  return (
    <AdminShell title="CRM">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Administration", href: "/admin" }, { label: "CRM" }]} />

      <p className="opacity-70 mb-4">Choisissez le type de contact à gérer. Acheteurs et vendeurs ont des parcours dédiés.</p>

      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href="/admin/crm/acheteurs"
          className="card p-8 border-l-4 border-l-teal-400 hover:shadow-md transition-shadow"
          data-testid="link-acheteurs"
        >
          <div className="text-4xl mb-2">🔑</div>
          <h2 className="luxe text-2xl mb-1">Acheteurs</h2>
          <p className="opacity-70 text-sm">Recherche de biens, critères, propositions, suivi.</p>
          <div className="mt-4 text-3xl font-semibold text-teal-700">{acheteurs}</div>
          <div className="text-xs opacity-75">lead(s) acheteur</div>
        </Link>

        <Link
          href="/admin/crm/vendeurs"
          className="card p-8 border-l-4 border-l-amber-400 hover:shadow-md transition-shadow"
          data-testid="link-vendeurs"
        >
          <div className="text-4xl mb-2">🏷️</div>
          <h2 className="luxe text-2xl mb-1">Vendeurs</h2>
          <p className="opacity-70 text-sm">Estimation, mandat, création du bien, signature.</p>
          <div className="mt-4 text-3xl font-semibold text-amber-700">{vendeurs}</div>
          <div className="text-xs opacity-75">lead(s) vendeur</div>
        </Link>
      </div>

      {patrimoine > 0 && (
        <p className="text-xs opacity-75 mt-4">{patrimoine} lead(s) « patrimoine » ne sont pas listés ici (hors acheteur/vendeur immobilier).</p>
      )}
    </AdminShell>
  );
}
