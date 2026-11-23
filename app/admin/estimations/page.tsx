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
  const [erreur, setErreur] = useState(false);
  const [contexte, setContexte] = useState({ leadId: "", propertyId: "" });
  const [creation, setCreation] = useState(false);

  const recharger = () =>
    fetch("/api/estimations")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setListe(Array.isArray(d) ? d : []); setErreur(false); })
      .catch(() => setErreur(true))
      .finally(() => setChargement(false));

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setContexte({ leadId: q.get("leadId") || "", propertyId: q.get("propertyId") || "" });
    recharger();
    fetch("/api/leads")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setLeads(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const creer = async () => {
    if (creation) return;
    setCreation(true);
    try {
    const r = await fetch("/api/estimations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre: "Nouvelle estimation", ...contexte, creationKey: crypto.randomUUID() }),
    });
    if (!r.ok) { toast("❌ Création impossible."); return; }
    const e = await r.json();
    window.location.href = `/admin/estimations/${e.id}`;
    } catch { toast("❌ Création impossible."); } finally { setCreation(false); }
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
        <button disabled={creation || erreur} onClick={creer} className="btn flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm" data-testid="nouvelle-estimation">
          <Plus className="h-4 w-4" /> Nouvelle estimation
        </button>
      </div>

      {(contexte.leadId || contexte.propertyId) && <p className="mb-3 text-sm">Estimations du dossier sélectionné · <Link className="underline" href="/admin/estimations">Voir toutes les estimations</Link></p>}
      {erreur ? <p role="alert">Chargement impossible. <button className="underline" onClick={recharger}>Réessayer</button></p> : chargement ? (
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
          {liste.filter(e => (!contexte.leadId || e.leadId === contexte.leadId) && (!contexte.propertyId || e.propertyId === contexte.propertyId)).map((e) => {
            const nom = nomDuLead(e.leadId);
            return (
              <div key={e.id} className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3">
                <div className="mr-auto min-w-0">
                  <Link href={`/admin/estimations/${e.id}`} className="font-medium hover:underline">
                    {e.titre || "Sans titre"}
                  </Link>
                  <p className="truncate text-xs text-stone-500">
                    {e.adresse || "adresse à renseigner"}
                    {e.surface ? ` · ${e.type} ${surfaceFr(e.surface)}` : ""}
                    {nom ? ` · ${nom}` : ""}
                    {e.snapshots?.length ? ` · ${e.snapshots.length} avis figé(s)` : " · brouillon privé"}
                    {` · modifiée le ${new Date(e.majAt ?? e.createdAt).toLocaleDateString("fr-FR")}`}
                  </p>
                </div>
                {e.prixRetenu > 0 && (
                  <span className="whitespace-nowrap font-semibold tabular-nums">{eur(e.prixRetenu)}</span>
                )}
                <button disabled={!!e.snapshots?.length} onClick={() => supprimer(e)} className="btn px-2 py-1 text-red-600 hover:bg-red-50" title="Supprimer">
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
