"use client";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Printer, FileText, Link2, PenLine } from "lucide-react";

type Owner = { type?: string; firstName?: string; lastName?: string; name?: string; address?: string };
type Mandat = {
  id: string;
  title?: string;
  type?: string;
  rooms?: number;
  city?: string;
  region?: string;
  map?: { query?: string };
  price?: number;
  netSellerAmount?: number;
  commissionAmount?: number;
  commissionPercentage?: number;
  mandateNumber?: string;
  mandateType?: 'SIMPLE' | 'EXCLUSIF' | 'SUCCES';
  mandateHonorairesCharge?: 'VENDEUR' | 'ACQUEREUR';
  occupancy?: string;
  mandatePlace?: string;
  owners?: Owner[];
  mandateSignStatus?: 'PENDING' | 'SIGNED';
  mandateSignature?: { signedAt?: string };
};

const eur = (n?: number) => (n || n === 0) ? Math.round(n as number).toLocaleString('fr-FR') + ' €' : '—';
const typeMandat = (t?: string) => t === 'SIMPLE' ? 'Simple' : t === 'EXCLUSIF' ? 'Exclusif' : t === 'SUCCES' ? 'Succès' : '—';

function mandantOf(m: Mandat): string {
  const o = m.owners?.[0];
  if (!o) return '—';
  return o.type === 'COMPANY' ? (o.name || '—') : [o.firstName, o.lastName].filter(Boolean).join(' ') || '—';
}
function mandantAddr(m: Mandat): string {
  return m.owners?.[0]?.address || '';
}
function bienLabel(m: Mandat): string {
  const t = (m.type === 'MAISON' ? 'Maison' : 'Appartement') + (m.rooms ? ` T${m.rooms}` : '');
  const addr = m.map?.query || [m.city, String(m.region || '').replaceAll('_', ' ')].filter(Boolean).join(', ');
  return addr ? `${t} — ${addr}` : t;
}

export default function Page() {
  const [items, setItems] = useState<Mandat[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [signInfo, setSignInfo] = useState<Record<string, { link: string; emailed: boolean; email: string }>>({});

  // Génère (ou régénère) le lien de signature électronique du mandat.
  const handleSign = async (m: Mandat) => {
    setSigningId(m.id);
    try {
      const res = await fetch(`/api/properties/${m.id}/mandat/sign-request`, { method: 'POST' });
      const d = await res.json();
      if (res.ok) {
        setSignInfo(prev => ({ ...prev, [m.id]: { link: d.url, emailed: !!d.emailed, email: d.signerEmail || '' } }));
        setItems(prev => prev.map(x => x.id === m.id ? { ...x, mandateSignStatus: 'PENDING' } : x));
      } else {
        alert(d.error || 'Erreur lors de la génération du lien.');
      }
    } catch { alert('Erreur réseau.'); }
    setSigningId(null);
  };

  useEffect(() => {
    fetch('/api/properties')
      .then(r => r.json())
      .then((data) => {
        const list: Mandat[] = Array.isArray(data) ? data : [];
        setItems(list.filter(m => m.mandateNumber || m.mandateType));
        setLoading(false);
      })
      .catch(() => { setItems([]); setLoading(false); });
  }, []);

  const mandats = useMemo(() => {
    return [...items].sort((a, b) => (a.mandateNumber || '').localeCompare(b.mandateNumber || '', 'fr', { numeric: true }));
  }, [items]);

  const signed = mandats.filter(m => m.mandateSignStatus === 'SIGNED').length;
  const pending = mandats.filter(m => m.mandateSignStatus === 'PENDING').length;

  return (
    <AdminShell title="Registre des mandats">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Administration", href: "/admin" }, { label: "Registre des mandats" }]} />

      <style>{`@media print {
        body * { visibility: hidden !important; }
        #registre, #registre * { visibility: visible !important; }
        #registre { position: absolute; left: 0; top: 0; width: 100%; }
        .no-print { display: none !important; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; }
      }`}</style>

      <div className="card p-4 mb-4 no-print">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-black/5 rounded text-center">
              <div className="text-2xl font-semibold">{mandats.length}</div>
              <div className="text-xs opacity-70">Mandats</div>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded text-center">
              <div className="text-2xl font-semibold text-green-700">{signed}</div>
              <div className="text-xs text-green-700">Signés</div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-center">
              <div className="text-2xl font-semibold text-amber-700">{pending}</div>
              <div className="text-xs text-amber-700">En attente</div>
            </div>
          </div>
          <button onClick={() => window.print()} className="btn-luxe flex items-center gap-2">
            <Printer className="w-4 h-4" /> Imprimer / Exporter en PDF
          </button>
        </div>
        <p className="text-xs opacity-60 mt-3">
          Registre des mandats tenu conformément à la loi n° 70-9 du 2 janvier 1970 (loi Hoguet) et au décret n° 72-678 du 20 juillet 1972.
          Les mandats sont inscrits par ordre chronologique de numéro.
        </p>
      </div>

      {loading && <div className="card p-6">Chargement…</div>}

      {!loading && mandats.length === 0 && (
        <div className="card p-6 opacity-70">
          Aucun mandat enregistré. Créez un mandat depuis le CRM Vendeurs (bouton « Mandat &amp; bien » d&apos;un vendeur) : le bien et son mandat seront automatiquement inscrits au registre.
        </div>
      )}

      {!loading && mandats.length > 0 && (
        <div id="registre" className="card p-0 overflow-hidden">
          <div className="p-4 border-b hidden print:block">
            <div className="text-lg font-semibold" style={{ color: '#1F3B2C' }}>NOVUS CAPITAL — Registre des mandats</div>
            <div className="text-xs opacity-70">CPI 7606 2024 000 000 038 — 50 rue de la Garenne, 76130 Mont-Saint-Aignan</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#1F3B2C] text-white text-left">
                  <th className="px-3 py-2 font-semibold">N°</th>
                  <th className="px-3 py-2 font-semibold">Date de signature</th>
                  <th className="px-3 py-2 font-semibold">Mandant</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Désignation du bien</th>
                  <th className="px-3 py-2 font-semibold text-right">Prix net vendeur</th>
                  <th className="px-3 py-2 font-semibold text-right">Honoraires</th>
                  <th className="px-3 py-2 font-semibold text-right">Prix FAI</th>
                  <th className="px-3 py-2 font-semibold">Statut</th>
                  <th className="px-3 py-2 font-semibold no-print">Doc.</th>
                </tr>
              </thead>
              <tbody>
                {mandats.map((m, i) => {
                  const addr = mandantAddr(m);
                  return (
                    <Fragment key={m.id}>
                    <tr className={i % 2 ? 'bg-black/[0.03]' : ''} style={{ borderBottom: '1px solid #eee' }}>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap">{m.mandateNumber || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {m.mandateSignature?.signedAt ? new Date(m.mandateSignature.signedAt).toLocaleDateString('fr-FR') : <span className="opacity-50">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{mandantOf(m)}</div>
                        {addr && <div className="text-xs opacity-60">{addr}</div>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{typeMandat(m.mandateType)}</td>
                      <td className="px-3 py-2">{bienLabel(m)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{eur(m.netSellerAmount ?? m.price)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{eur(m.commissionAmount)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{eur(m.price)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {m.mandateSignStatus === 'SIGNED' ? (
                          <span className="text-green-700 font-medium">✔ Signé</span>
                        ) : m.mandateSignStatus === 'PENDING' ? (
                          <span className="text-amber-700">En attente</span>
                        ) : (
                          <span className="opacity-50">Non envoyé</span>
                        )}
                      </td>
                      <td className="px-3 py-2 no-print">
                        <div className="flex gap-2">
                          {m.mandateSignStatus !== 'SIGNED' && (
                            <button
                              onClick={() => handleSign(m)}
                              disabled={signingId === m.id}
                              title={m.mandateSignStatus === 'PENDING' ? 'Régénérer le lien de signature' : 'Générer le lien de signature'}
                              className="text-[#1F3B2C] hover:opacity-70 disabled:opacity-40"
                              data-testid={`button-sign-${m.id}`}
                            >
                              <PenLine className="w-4 h-4" />
                            </button>
                          )}
                          <a href={`/api/properties/${m.id}/mandat/pdf`} target="_blank" rel="noopener noreferrer" title="Mandat PDF" className="text-[#B89C6D] hover:opacity-70">
                            <FileText className="w-4 h-4" />
                          </a>
                          <a href={`/admin/contenu/biens?edit=${m.id}`} title="Modifier le mandat / le bien" className="text-gray-500 hover:opacity-70">
                            <Link2 className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                    {signInfo[m.id] && (
                      <tr className="no-print">
                        <td colSpan={10} className="px-3 py-2 bg-amber-50" style={{ borderBottom: '1px solid #eee' }}>
                          <div className="flex gap-2 items-center flex-wrap">
                            <span className="text-xs font-medium whitespace-nowrap">✍️ Lien de signature :</span>
                            <input
                              readOnly
                              value={signInfo[m.id].link}
                              onFocus={e => e.currentTarget.select()}
                              className="flex-1 min-w-[220px] px-2 py-1 text-xs border rounded bg-white"
                            />
                            <button
                              onClick={() => navigator.clipboard?.writeText(signInfo[m.id].link)}
                              className="px-2 py-1 text-xs border rounded hover:bg-white"
                            >
                              Copier
                            </button>
                            {signInfo[m.id].emailed ? (
                              <span className="text-xs text-green-700 whitespace-nowrap">✉️ Envoyé à {signInfo[m.id].email}</span>
                            ) : (
                              <span className="text-xs text-gray-500">{signInfo[m.id].email ? "Email non envoyé — copiez le lien" : "Aucun email du mandant — copiez le lien et transmettez-le"}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 text-xs opacity-60 border-t hidden print:block">
            Édité le {new Date().toLocaleDateString('fr-FR')} — {mandats.length} mandat(s) inscrit(s).
          </div>
        </div>
      )}
    </AdminShell>
  );
}
