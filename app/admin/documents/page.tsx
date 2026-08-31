"use client";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import { useToast } from "@/components/Toast";
import { useEffect, useMemo, useState } from "react";
import { FileText, Search, Send, CheckCircle2, Clock } from "lucide-react";

// Registre des documents signés sur le terrain (bons de visite, offres d'achat).
// Ils étaient jusqu'ici enregistrés sans être consultables ailleurs que sur
// l'écran de création.
type Doc = {
  id: string; createdAt?: string; type: "VISITE" | "OFFRE"; number?: string;
  propertyId?: string; propertyTitle?: string; propertyCity?: string;
  client?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  offerAmount?: number; atAskingPrice?: boolean; sequestreAmount?: number;
  validityDays?: number; financing?: string; signedAt?: string;
  owner?: { name?: string; email?: string };
  ownerSignStatus?: "PENDING" | "SIGNED"; ownerSignedAt?: string;
};

const eur = (n?: number) =>
  n || n === 0 ? Math.round(n).toLocaleString("fr-FR").replace(/[  ]/g, " ") + " €" : "—";
const dt = (s?: string) => { try { return s ? new Date(s).toLocaleDateString("fr-FR") : "—"; } catch { return "—"; } };
const clientOf = (d: Doc) => [d.client?.firstName, d.client?.lastName].filter(Boolean).join(" ") || "—";

export default function Page() {
  const push = useToast();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState<"TOUS" | "VISITE" | "OFFRE">("TOUS");
  const [envoi, setEnvoi] = useState<string | null>(null);

  const charger = () => {
    setLoading(true);
    fetch("/api/documents")
      .then(r => r.json())
      .then(d => setDocs(Array.isArray(d) ? d : []))
      .catch(() => push("Chargement impossible.", "error"))
      .finally(() => setLoading(false));
  };
  useEffect(charger, []); // eslint-disable-line react-hooks/exhaustive-deps

  const liste = useMemo(() => {
    const t = q.trim().toLowerCase();
    return docs
      .filter(d => filtre === "TOUS" || d.type === filtre)
      .filter(d => !t || [d.number, d.propertyTitle, d.propertyCity, clientOf(d), d.client?.email, d.owner?.name]
        .some(v => (v || "").toString().toLowerCase().includes(t)))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [docs, q, filtre]);

  const relancer = async (d: Doc) => {
    if (!d.owner?.email) return push("Aucun email de propriétaire enregistré sur ce document.", "error");
    setEnvoi(d.id);
    try {
      const r = await fetch(`/api/documents/${d.id}/owner-request`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: d.owner?.name || "", email: d.owner?.email }),
      });
      const j = await r.json();
      if (r.ok) { push(`Demande d'acceptation envoyée à ${j.sentTo}.`, "success"); charger(); }
      else push(j.error || "Envoi impossible.", "error");
    } catch { push("Erreur réseau.", "error"); }
    setEnvoi(null);
  };

  const nbVisites = docs.filter(d => d.type === "VISITE").length;
  const nbOffres = docs.filter(d => d.type === "OFFRE").length;
  const nbAttente = docs.filter(d => d.type === "OFFRE" && d.ownerSignStatus === "PENDING").length;

  return (
    <main>
      <AdminShell title="Documents">
        <Breadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Documents" }]} />

        <div className="card p-5 mt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-6">
              <div><div className="text-2xl luxe">{nbVisites}</div><div className="text-xs opacity-75">bons de visite</div></div>
              <div><div className="text-2xl luxe">{nbOffres}</div><div className="text-xs opacity-75">offres d&apos;achat</div></div>
              {nbAttente > 0 && (
                <div><div className="text-2xl luxe text-amber-700">{nbAttente}</div><div className="text-xs opacity-75">en attente du vendeur</div></div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 opacity-50" />
                <input className="input pl-8" aria-label="Rechercher un document" placeholder="N°, client, bien…"
                  value={q} onChange={e => setQ(e.target.value)} data-testid="input-search-documents" />
              </div>
              <select className="input" aria-label="Filtrer par type de document" value={filtre}
                onChange={e => setFiltre(e.target.value as any)} data-testid="select-filter-type">
                <option value="TOUS">Tous les types</option>
                <option value="VISITE">Bons de visite</option>
                <option value="OFFRE">Offres d&apos;achat</option>
              </select>
            </div>
          </div>
          <p className="mt-3 text-xs opacity-70">
            Documents signés depuis l&apos;application terrain. Le PDF archivé est celui remis au client.
          </p>
        </div>

        {loading && <div className="card p-6 mt-4">Chargement…</div>}

        {!loading && liste.length === 0 && (
          <div className="card p-6 mt-4 opacity-75" data-testid="text-empty">
            Aucun document. Depuis l&apos;application terrain (<code>/terrain</code>), créez un bon de visite ou une offre d&apos;achat : il apparaîtra ici.
          </div>
        )}

        {!loading && liste.length > 0 && (
          <div className="card mt-4 overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-black/[0.03] text-left">
                <tr>
                  <th className="p-3 font-semibold">N°</th>
                  <th className="p-3 font-semibold">Type</th>
                  <th className="p-3 font-semibold">Date</th>
                  <th className="p-3 font-semibold">Client</th>
                  <th className="p-3 font-semibold">Bien</th>
                  <th className="p-3 font-semibold">Montant</th>
                  <th className="p-3 font-semibold">Vendeur</th>
                  <th className="p-3 font-semibold">PDF</th>
                </tr>
              </thead>
              <tbody>
                {liste.map(d => (
                  <tr key={d.id} className="border-b last:border-0 align-top" data-testid={`row-doc-${d.id}`}>
                    <td className="p-3 whitespace-nowrap font-medium">{d.number || "—"}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${d.type === "OFFRE" ? "bg-[#B89C6D]/20 text-luxe" : "bg-black/5"}`}>
                        {d.type === "OFFRE" ? "Offre d'achat" : "Bon de visite"}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">{dt(d.createdAt)}</td>
                    <td className="p-3">
                      <div>{clientOf(d)}</div>
                      {d.client?.email && <div className="text-xs opacity-75">{d.client.email}</div>}
                    </td>
                    <td className="p-3">
                      <div>{d.propertyTitle || "—"}</div>
                      {d.propertyCity && <div className="text-xs opacity-75">{d.propertyCity}</div>}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {d.type === "OFFRE" ? (d.atAskingPrice ? "Au prix affiché" : eur(d.offerAmount)) : "—"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {d.type !== "OFFRE" ? <span className="opacity-50">—</span>
                        : d.ownerSignStatus === "SIGNED" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700" data-testid={`status-signed-${d.id}`}>
                            <CheckCircle2 className="h-4 w-4" /> Acceptée
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 text-amber-700">
                              <Clock className="h-4 w-4" /> {d.ownerSignStatus === "PENDING" ? "En attente" : "Non envoyée"}
                            </span>
                            <button onClick={() => relancer(d)} disabled={envoi === d.id || !d.owner?.email}
                              className="inline-flex items-center gap-1 text-xs text-[#B89C6D] underline disabled:opacity-40"
                              title={d.owner?.email || "Aucun email de propriétaire"}
                              data-testid={`button-relance-${d.id}`}>
                              <Send className="h-3 w-3" /> {envoi === d.id ? "Envoi…" : d.ownerSignStatus === "PENDING" ? "Relancer" : "Envoyer"}
                            </button>
                          </div>
                        )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <a href={`/api/documents/${d.id}/pdf`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#B89C6D] underline" data-testid={`link-pdf-${d.id}`}>
                        <FileText className="h-4 w-4" /> Ouvrir
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminShell>
    </main>
  );
}
