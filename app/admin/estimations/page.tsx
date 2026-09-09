"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { surfaceFr } from "@/lib/formatFr";
import { Plus, Trash2, Calculator } from "lucide-react";

const eur = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";

export default function Page() {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [liste, setListe] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);

  const recharger = () =>
    fetch("/api/estimations")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setListe(Array.isArray(d) ? d : []))
      .finally(() => setChargement(false));

  useEffect(() => {
    recharger();
    fetch("/api/leads")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setLeads(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const creer = async () => {
    const r = await fetch("/api/estimations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre: "Nouvelle estimation" }),
    });
    if (!r.ok) { toast("❌ Création impossible."); return; }
    const e = await r.json();
    window.location.href = `/admin/estimations/${e.id}`;
  };

  const supprimer = async (e: any) => {
    const nom = e.titre || e.adresse || "Sans titre";
    if (!(await confirm(`« ${nom} » sera définitivement supprimée.`, { title: "Supprimer cette estimation ?" }))) return;
    const r = await fetch(`/api/estimations/${e.id}`, { method: "DELETE" });
    if (!r.ok) { toast("❌ Suppression impossible."); return; }
    toast("✅ Estimation supprimée.");
    recharger();
  };

  const nomDuLead = (leadId?: string) => {
    const l = leads.find((x) => x.id === leadId);
    if (!l) return null;
    return [l.firstName, l.lastName].filter(Boolean).join(" ") || l.email;
  };

  return (
    <AdminShell title="Estimations">
      {dialog}
      <Breadcrumb items={[{ label: "Estimations" }]} />

      <div className="mb-4 flex items-center gap-2 rounded-xl border bg-white px-4 py-3">
        <p className="mr-auto text-sm text-stone-600">
          Avis de valeur assis sur les ventes signées du secteur, corrigés critère par critère.
        </p>
        <button onClick={creer} className="btn flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm" data-testid="nouvelle-estimation">
          <Plus className="h-4 w-4" /> Nouvelle estimation
        </button>
      </div>

      {chargement ? (
        <p className="text-sm">Chargement…</p>
      ) : liste.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center">
          <Calculator className="mx-auto mb-2 h-8 w-8 text-stone-400" />
          <p className="text-sm text-stone-600">
            Aucune estimation. Vous pouvez aussi en ouvrir une directement depuis un lead vendeur.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {liste.map((e) => {
            const nom = nomDuLead(e.leadId);
            return (
              <div key={e.id} className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3">
                <div className="mr-auto min-w-0">
                  <Link href={`/admin/estimations/${e.id}`} className="font-medium hover:underline">
                    {e.titre || "Sans titre"}
                  </Link>
                  <p className="truncate text-xs text-stone-500">
                    {e.adresse || "adresse à renseigner"}
                    {e.surface ? ` · ${e.type} ${surfaceFr(e.surface)} m²` : ""}
                    {nom ? ` · ${nom}` : ""}
                    {` · modifiée le ${new Date(e.majAt ?? e.createdAt).toLocaleDateString("fr-FR")}`}
                  </p>
                </div>
                {e.prixRetenu > 0 && (
                  <span className="whitespace-nowrap font-semibold tabular-nums">{eur(e.prixRetenu)}</span>
                )}
                <button onClick={() => supprimer(e)} className="btn px-2 py-1 text-red-600 hover:bg-red-50" title="Supprimer">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
