"use client";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import { useEffect, useMemo, useState } from "react";
import { Printer, FileText, PenLine, Trash2, Save } from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";

type Owner = { type?: string; firstName?: string; lastName?: string; name?: string; address?: string; email?: string };
type Mandat = {
  id: string;
  createdAt?: string;
  mandateNumber?: string;
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
  occupancy?: string;
  mandateType?: 'SIMPLE' | 'EXCLUSIF' | 'SUCCES';
  mandateHonorairesCharge?: 'VENDEUR' | 'ACQUEREUR';
  mandatePlace?: string;
  owners?: Owner[];
  mandateSignStatus?: 'PENDING' | 'SIGNED';
  mandateSignature?: { signedAt?: string };
  mandateSignerEmail?: string;
};

const eur = (n?: number) => (n || n === 0) ? Math.round(n as number).toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' €' : '—';
const typeLabel = (m: Mandat) => (m.type === 'MAISON' ? 'Maison' : 'Appartement') + (m.rooms ? ` T${m.rooms}` : '');
function mandantOf(m: Mandat): string {
  const os = m.owners || [];
  if (!os.length) return '—';
  return os.map(o => o.type === 'COMPANY' ? (o.name || '') : [o.firstName, o.lastName].filter(Boolean).join(' ')).filter(Boolean).join(' ; ') || '—';
}

export default function Page() {
  const [items, setItems] = useState<Mandat[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [signInfo, setSignInfo] = useState<Record<string, { link: string; emailed: boolean; email: string }>>({});

  const load = () => {
    fetch('/api/mandats')
      .then(r => r.json())
      .then((d) => { setItems(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setItems([]); setLoading(false); });
  };
  useEffect(load, []);

  const mandats = useMemo(() =>
    [...items].sort((a, b) => (a.mandateNumber || '').localeCompare(b.mandateNumber || '', 'fr', { numeric: true })),
    [items]);
  const signed = mandats.filter(m => m.mandateSignStatus === 'SIGNED').length;
  const pending = mandats.filter(m => m.mandateSignStatus === 'PENDING').length;

  const patchLocal = (id: string, patch: Partial<Mandat>) => setItems(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  const setOwner = (m: Mandat, oi: number, patch: Partial<Owner>) => {
    const owners = [...(m.owners || [])];
    owners[oi] = { type: 'INDIVIDUAL', ...(owners[oi] || {}), ...patch };
    patchLocal(m.id, { owners });
  };
  const addOwner = (m: Mandat) => patchLocal(m.id, { owners: [...(m.owners || []), { type: 'INDIVIDUAL' }] });
  const removeOwner = (m: Mandat, oi: number) => patchLocal(m.id, { owners: (m.owners || []).filter((_, i) => i !== oi) });
  const fmtNum = (n?: number) => (n || n === 0) ? Number(n).toLocaleString('fr-FR') : '';

  const save = async (m: Mandat) => {
    setSavingId(m.id);
    try {
      const res = await fetch(`/api/mandats/${m.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mandateNumber: m.mandateNumber, mandateType: m.mandateType,
          mandateHonorairesCharge: m.mandateHonorairesCharge, mandatePlace: m.mandatePlace,
          occupancy: m.occupancy, netSellerAmount: m.netSellerAmount, price: m.price,
          commissionAmount: (m.price || 0) - (m.netSellerAmount || 0) || undefined,
          owners: m.owners,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || 'Erreur à l\'enregistrement.'); }
    } catch { alert('Erreur réseau.'); }
    setSavingId(null);
  };

  const handleSign = async (m: Mandat) => {
    setSigningId(m.id);
    try {
      const res = await fetch(`/api/mandats/${m.id}/sign-request`, { method: 'POST' });
      const d = await res.json();
      if (res.ok) {
        setSignInfo(prev => ({ ...prev, [m.id]: { link: d.url, emailed: !!d.emailed, email: d.signerEmail || '' } }));
        patchLocal(m.id, { mandateSignStatus: 'PENDING' });
      } else { alert(d.error || 'Erreur lors de la génération du lien.'); }
    } catch { alert('Erreur réseau.'); }
    setSigningId(null);
  };

  const remove = async (m: Mandat) => {
    if (!confirm(`Supprimer le mandat ${m.mandateNumber || ''} ? Cette action est définitive.`)) return;
    try {
      const res = await fetch(`/api/mandats/${m.id}`, { method: 'DELETE' });
      if (res.ok) setItems(prev => prev.filter(x => x.id !== m.id));
      else alert('Erreur à la suppression.');
    } catch { alert('Erreur réseau.'); }
  };

  const inputCls = "w-full px-2 py-1 text-sm border rounded";

  return (
    <AdminShell title="Registre des mandats">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Administration", href: "/admin" }, { label: "Registre des mandats" }]} />

      <style>{`@media print {
        body * { visibility: hidden !important; }
        #registre-print, #registre-print * { visibility: visible !important; }
        #registre-print { position: absolute; left: 0; top: 0; width: 100%; }
        .no-print { display: none !important; }
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
          Registre tenu conformément à la loi n° 70-9 du 2 janvier 1970 (loi Hoguet). Les mandats sont modifiables ici, sans repasser par la fiche du bien.
        </p>
      </div>

      {loading && <div className="card p-6 no-print">Chargement…</div>}

      {!loading && mandats.length === 0 && (
        <div className="card p-6 opacity-70 no-print">
          Aucun mandat. Depuis une fiche bien (Contenu → Biens), cliquez sur « Générer un mandat » : un mandat autonome est créé et apparaît ici.
        </div>
      )}

      {/* Gestion — cartes éditables */}
      <div className="space-y-3 no-print">
        {mandats.map((m) => (
          <div key={m.id} className="card p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div>
                <div className="text-xs opacity-60">Mandat N°</div>
                <input value={m.mandateNumber || ''} onChange={e => patchLocal(m.id, { mandateNumber: e.target.value })} className="px-2 py-1 text-lg font-semibold border rounded w-40" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`pill text-xs font-semibold ${m.mandateSignStatus === 'SIGNED' ? 'bg-green-100 border-green-300 text-green-700' : m.mandateSignStatus === 'PENDING' ? 'bg-amber-100 border-amber-300 text-amber-700' : 'opacity-60'}`}>
                  {m.mandateSignStatus === 'SIGNED' ? `✔ Signé${m.mandateSignature?.signedAt ? ' le ' + new Date(m.mandateSignature.signedAt).toLocaleDateString('fr-FR') : ''}` : m.mandateSignStatus === 'PENDING' ? 'En attente de signature' : 'Non envoyé'}
                </span>
                <button onClick={() => save(m)} disabled={savingId === m.id} className="btn-luxe text-xs flex items-center gap-1 disabled:opacity-60">
                  <Save className="w-3.5 h-3.5" /> {savingId === m.id ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <a href={`/api/mandats/${m.id}/pdf`} target="_blank" rel="noopener noreferrer" title="Mandat PDF" className="p-1.5 text-[#B89C6D] hover:opacity-70"><FileText className="w-4 h-4" /></a>
                {m.mandateSignStatus !== 'SIGNED' && (
                  <button onClick={() => handleSign(m)} disabled={signingId === m.id} title="Générer le lien de signature" className="p-1.5 text-[#1F3B2C] hover:opacity-70 disabled:opacity-40"><PenLine className="w-4 h-4" /></button>
                )}
                <button onClick={() => remove(m)} title="Supprimer" className="p-1.5 text-red-600 hover:opacity-70"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="text-sm font-medium text-[#1F3B2C] mb-2">{typeLabel(m)} — {m.map?.query || [m.city, String(m.region || '').replaceAll('_', ' ')].filter(Boolean).join(', ')}</div>

            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs opacity-60">Mandant(s)</label>
                  <button type="button" onClick={() => addOwner(m)} className="text-xs text-[#B89C6D] hover:underline">+ Ajouter un mandant</button>
                </div>
                <div className="space-y-2">
                  {(m.owners && m.owners.length ? m.owners : [{ type: 'INDIVIDUAL' } as Owner]).map((o, oi) => (
                    <div key={oi} className="border rounded p-2 bg-black/[0.02]">
                      <div className="flex items-center gap-3 mb-1 text-xs">
                        <label className="flex items-center gap-1"><input type="radio" checked={o.type !== 'COMPANY'} onChange={() => setOwner(m, oi, { type: 'INDIVIDUAL', name: undefined })} /> Particulier</label>
                        <label className="flex items-center gap-1"><input type="radio" checked={o.type === 'COMPANY'} onChange={() => setOwner(m, oi, { type: 'COMPANY' })} /> Société</label>
                        {(m.owners?.length || 0) > 1 && <button type="button" onClick={() => removeOwner(m, oi)} className="ml-auto text-red-600 hover:underline">Retirer</button>}
                      </div>
                      {o.type === 'COMPANY' ? (
                        <input placeholder="Raison sociale" value={o.name || ''} onChange={e => setOwner(m, oi, { name: e.target.value })} className={inputCls} />
                      ) : (
                        <div className="grid grid-cols-2 gap-1">
                          <input placeholder="Prénom" value={o.firstName || ''} onChange={e => setOwner(m, oi, { firstName: e.target.value })} className={inputCls} />
                          <input placeholder="Nom" value={o.lastName || ''} onChange={e => setOwner(m, oi, { lastName: e.target.value })} className={inputCls} />
                        </div>
                      )}
                      <div className="mt-1">
                        <AddressAutocomplete
                          value={o.address || ''}
                          onChange={(c) => setOwner(m, oi, { address: c.address })}
                          onTextChange={(t) => setOwner(m, oi, { address: t })}
                          placeholder="Adresse du mandant"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs opacity-60 mb-1">Type de mandat</label>
                <select value={m.mandateType || 'SIMPLE'} onChange={e => patchLocal(m.id, { mandateType: e.target.value as any })} className={inputCls}>
                  <option value="SIMPLE">Simple</option>
                  <option value="EXCLUSIF">Exclusif</option>
                  <option value="SUCCES">Succès</option>
                </select>
              </div>
              <div>
                <label className="block text-xs opacity-60 mb-1">Occupation</label>
                <select value={m.occupancy || 'LIBRE'} onChange={e => patchLocal(m.id, { occupancy: e.target.value })} className={inputCls}>
                  <option value="LIBRE">Libre</option>
                  <option value="OCCUPE">Loué (occupé)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs opacity-60 mb-1">Honoraires à la charge de</label>
                <select value={m.mandateHonorairesCharge || 'ACQUEREUR'} onChange={e => patchLocal(m.id, { mandateHonorairesCharge: e.target.value as any })} className={inputCls}>
                  <option value="ACQUEREUR">Acquéreur</option>
                  <option value="VENDEUR">Vendeur</option>
                </select>
              </div>
              <div>
                <label className="block text-xs opacity-60 mb-1">Prix net vendeur (€)</label>
                <input inputMode="numeric" value={fmtNum(m.netSellerAmount)} onChange={e => { const v = e.target.value.replace(/[^\d]/g, ''); patchLocal(m.id, { netSellerAmount: v ? Number(v) : undefined }); }} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs opacity-60 mb-1">Prix FAI (€)</label>
                <input inputMode="numeric" value={fmtNum(m.price)} onChange={e => { const v = e.target.value.replace(/[^\d]/g, ''); patchLocal(m.id, { price: v ? Number(v) : undefined }); }} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs opacity-60 mb-1">Honoraires (auto)</label>
                <div className="px-2 py-1 text-sm bg-black/5 rounded">{eur((m.price || 0) - (m.netSellerAmount || 0))}</div>
              </div>
              <div>
                <label className="block text-xs opacity-60 mb-1">Fait à</label>
                <input value={m.mandatePlace || ''} onChange={e => patchLocal(m.id, { mandatePlace: e.target.value })} placeholder={m.city || 'Ville'} className={inputCls} />
              </div>
            </div>

            {signInfo[m.id] && (
              <div className="mt-3 p-2 bg-amber-50 rounded flex gap-2 items-center flex-wrap">
                <span className="text-xs font-medium whitespace-nowrap">✍️ Lien de signature :</span>
                <input readOnly value={signInfo[m.id].link} onFocus={e => e.currentTarget.select()} className="flex-1 min-w-[220px] px-2 py-1 text-xs border rounded bg-white" />
                <button onClick={() => navigator.clipboard?.writeText(signInfo[m.id].link)} className="px-2 py-1 text-xs border rounded hover:bg-white">Copier</button>
                {signInfo[m.id].emailed
                  ? <span className="text-xs text-green-700 whitespace-nowrap">✉️ Envoyé à {signInfo[m.id].email}</span>
                  : <span className="text-xs text-gray-500">{signInfo[m.id].email ? 'Email non envoyé — copiez le lien' : 'Aucun email du mandant — copiez le lien'}</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Version imprimable — registre chronologique (loi Hoguet) */}
      <div id="registre-print" className="hidden print:block">
        <div className="mb-3">
          <div className="text-lg font-semibold" style={{ color: '#1F3B2C' }}>NOVUS CAPITAL — Registre des mandats</div>
          <div className="text-xs opacity-70">CPI 7606 2024 000 000 038 — 50 rue de la Garenne, 76130 Mont-Saint-Aignan</div>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left" style={{ borderBottom: '2px solid #1F3B2C' }}>
              <th className="px-2 py-1">N°</th>
              <th className="px-2 py-1">Date signature</th>
              <th className="px-2 py-1">Mandant</th>
              <th className="px-2 py-1">Type</th>
              <th className="px-2 py-1">Désignation du bien</th>
              <th className="px-2 py-1 text-right">Net vendeur</th>
              <th className="px-2 py-1 text-right">Honoraires</th>
              <th className="px-2 py-1 text-right">Prix FAI</th>
              <th className="px-2 py-1">Statut</th>
            </tr>
          </thead>
          <tbody>
            {mandats.map((m) => (
              <tr key={m.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td className="px-2 py-1 font-semibold">{m.mandateNumber || '—'}</td>
                <td className="px-2 py-1">{m.mandateSignature?.signedAt ? new Date(m.mandateSignature.signedAt).toLocaleDateString('fr-FR') : '—'}</td>
                <td className="px-2 py-1">{mandantOf(m)}<br /><span className="text-xs opacity-60">{(m.owners || []).map(o => o.address).filter(Boolean).join(' ; ')}</span></td>
                <td className="px-2 py-1">{m.mandateType === 'EXCLUSIF' ? 'Exclusif' : m.mandateType === 'SUCCES' ? 'Succès' : 'Simple'}</td>
                <td className="px-2 py-1">{typeLabel(m)} — {m.map?.query || m.city}</td>
                <td className="px-2 py-1 text-right">{eur(m.netSellerAmount ?? m.price)}</td>
                <td className="px-2 py-1 text-right">{eur((m.price || 0) - (m.netSellerAmount || 0))}</td>
                <td className="px-2 py-1 text-right">{eur(m.price)}</td>
                <td className="px-2 py-1">{m.mandateSignStatus === 'SIGNED' ? 'Signé' : m.mandateSignStatus === 'PENDING' ? 'En attente' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-xs opacity-60 mt-3">Édité le {new Date().toLocaleDateString('fr-FR')} — {mandats.length} mandat(s) inscrit(s).</div>
      </div>
    </AdminShell>
  );
}
