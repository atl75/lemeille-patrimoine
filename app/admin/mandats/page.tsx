"use client";
import AdminShell from "@/components/AdminShell";
import { useToast } from "@/components/Toast";
import Breadcrumb from "@/components/Breadcrumb";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Printer, FileText, PenLine, Trash2, Save, Plus, Lock } from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import CompanyAutocomplete from "@/components/CompanyAutocomplete";

type Owner = { type?: string; firstName?: string; lastName?: string; name?: string; address?: string; email?: string; phone?: string; siren?: string; legalForm?: string; managerFirstName?: string; managerLastName?: string; managerRole?: string };
type Signer = { ownerIndex?: number; name?: string; email?: string; phone?: string; url?: string; signed?: boolean; emailed?: boolean };
type Mandat = {
  id: string;
  createdAt?: string;
  mandateNumber?: string;
  title?: string;
  type?: string;
  rooms?: number;
  city?: string;
  region?: string;
  designation?: string;
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
  signers?: { ownerIndex?: number; name?: string; signedAt?: string; dataUrl?: string }[];
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
  const toast = useToast();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [signInfo, setSignInfo] = useState<Record<string, Signer[]>>({});

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
  const setOwner = (m: Mandat, oi: number, patch: Partial<Owner>) => setItems(prev => prev.map(x => {
    if (x.id !== m.id) return x;
    const owners = [...(x.owners || [])];
    owners[oi] = { type: 'INDIVIDUAL', ...(owners[oi] || {}), ...patch };
    return { ...x, owners };
  }));

  // Sélection d'une société : champs depuis l'API entreprise, puis réinjection
  // des infos mémorisées (gérant, courriel, téléphone saisis à la main).
  const onCompanySelect = async (m: Mandat, oi: number, c: any) => {
    setOwner(m, oi, { type: 'COMPANY', name: c.name, siren: c.siren, address: c.address || undefined, legalForm: c.legalForm, managerFirstName: c.managerFirstName, managerLastName: c.managerLastName, managerRole: c.managerRole });
    try {
      const q = c.siren ? `siren=${encodeURIComponent(c.siren)}` : `name=${encodeURIComponent(c.name || '')}`;
      const r = await fetch(`/api/company-contacts?${q}`);
      const d = await r.json();
      const s = d?.contact;
      if (s) setOwner(m, oi, {
        email: s.email || undefined, phone: s.phone || undefined,
        managerFirstName: s.managerFirstName || c.managerFirstName || undefined,
        managerLastName: s.managerLastName || c.managerLastName || undefined,
        managerRole: s.managerRole || c.managerRole || undefined,
        legalForm: s.legalForm || c.legalForm || undefined,
        address: s.address || c.address || undefined,
      });
    } catch { /* pas de contact mémorisé */ }
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
          designation: m.designation, map: m.map, city: m.city,
          occupancy: m.occupancy, netSellerAmount: m.netSellerAmount, price: m.price,
          commissionAmount: (m.price || 0) - (m.netSellerAmount || 0) || undefined,
          owners: m.owners,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast(d.error || 'Erreur à l\'enregistrement.'); }
      else {
        // Mémorise les infos saisies pour chaque société (réinjectées la fois suivante).
        for (const o of (m.owners || [])) {
          if (o.type === 'COMPANY' && (o.name || o.siren)) {
            fetch('/api/company-contacts', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ siren: o.siren, name: o.name, legalForm: o.legalForm, address: o.address, managerFirstName: o.managerFirstName, managerLastName: o.managerLastName, managerRole: o.managerRole, email: o.email, phone: o.phone }),
            }).catch(() => {});
          }
        }
      }
    } catch { toast('Erreur réseau.'); }
    setSavingId(null);
  };

  const handleSign = async (m: Mandat) => {
    setSigningId(m.id);
    try {
      const res = await fetch(`/api/mandats/${m.id}/sign-request`, { method: 'POST' });
      const d = await res.json();
      if (res.ok) {
        setSignInfo(prev => ({ ...prev, [m.id]: Array.isArray(d.signers) ? d.signers : [] }));
        patchLocal(m.id, { mandateSignStatus: 'PENDING' });
      } else { toast(d.error || 'Erreur lors de la génération des liens.'); }
    } catch { toast('Erreur réseau.'); }
    setSigningId(null);
  };

  const [creating, setCreating] = useState(false);
  const createMandat = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/mandats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const d = await res.json();
      if (res.ok && d?.id) {
        setItems(prev => [...prev, d]);
        setEditingId(d.id);
        setTimeout(() => document.getElementById(`row-${d.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      } else { toast(d.error || 'Erreur à la création du mandat.'); }
    } catch { toast('Erreur réseau.'); }
    setCreating(false);
  };

  const remove = async (m: Mandat) => {
    if (!confirm(`Supprimer le mandat ${m.mandateNumber || ''} ? Cette action est définitive.`)) return;
    try {
      const res = await fetch(`/api/mandats/${m.id}`, { method: 'DELETE' });
      if (res.ok) setItems(prev => prev.filter(x => x.id !== m.id));
      else toast('Erreur à la suppression.');
    } catch { toast('Erreur réseau.'); }
  };

  const inputCls = "w-full px-2 py-1 text-sm border rounded";

  return (
    <AdminShell title="Registre des mandats">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Administration", href: "/admin" }, { label: "Registre des mandats" }]} />

      <style>{`@media print {
        body * { visibility: hidden !important; }
        #registre, #registre * { visibility: visible !important; }
        #registre { position: absolute; left: 0; top: 0; width: 100%; }
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
          <div className="flex gap-2">
            <button onClick={createMandat} disabled={creating} className="flex items-center gap-2 px-3 py-2 border border-[#1F3B2C] text-[#1F3B2C] rounded hover:bg-[#1F3B2C]/5 disabled:opacity-60">
              <Plus className="w-4 h-4" /> {creating ? 'Création…' : 'Nouveau mandat'}
            </button>
            <button onClick={() => window.print()} className="btn-luxe flex items-center gap-2">
              <Printer className="w-4 h-4" /> Imprimer / Exporter en PDF
            </button>
          </div>
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
                  <th className="px-3 py-2 font-semibold no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mandats.map((m, i) => (
                  <Fragment key={m.id}>
                    <tr id={`row-${m.id}`} className={i % 2 ? 'bg-black/[0.03]' : ''} style={{ borderBottom: '1px solid #eee' }}>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap">{m.mandateNumber || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{m.mandateSignature?.signedAt ? new Date(m.mandateSignature.signedAt).toLocaleDateString('fr-FR') : <span className="opacity-50">—</span>}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{mandantOf(m)}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{m.mandateType === 'EXCLUSIF' ? 'Exclusif' : m.mandateType === 'SUCCES' ? 'Succès' : 'Simple'}</td>
                      <td className="px-3 py-2">{[m.designation || typeLabel(m), m.map?.query || [m.city, String(m.region || '').replaceAll('_', ' ')].filter(Boolean).join(', ')].filter(Boolean).join(' — ')}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{eur(m.netSellerAmount ?? m.price)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{eur((m.price || 0) - (m.netSellerAmount || 0))}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{eur(m.price)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {(() => {
                          const total = (m.signers?.length) || (m.owners?.length) || 1;
                          const done = (m.signers || []).filter(s => s.dataUrl || s.signedAt).length;
                          if (m.mandateSignStatus === 'SIGNED') return <span className="text-green-700 font-medium">✔ Signé{total > 1 ? ` (${total}/${total})` : ''}</span>;
                          if (m.mandateSignStatus === 'PENDING') return <span className="text-amber-700">En attente{total > 1 ? ` (${done}/${total} signés)` : ''}</span>;
                          return <span className="opacity-50">Non envoyé</span>;
                        })()}
                      </td>
                      <td className="px-3 py-2 no-print">
                        <div className="flex gap-2 items-center">
                          {m.mandateSignStatus === 'SIGNED' ? (
                            <span className="text-xs px-2 py-1 border rounded bg-green-50 border-green-200 text-green-700 flex items-center gap-1" title="Mandat signé — figé, non modifiable"><Lock className="w-3 h-3" /> Figé</span>
                          ) : (
                            <button onClick={() => setEditingId(editingId === m.id ? null : m.id)} className={`text-xs px-2 py-1 border rounded ${editingId === m.id ? 'bg-[#1F3B2C] text-white border-[#1F3B2C]' : 'hover:bg-black/5'}`} data-testid={`button-edit-${m.id}`}>
                              {editingId === m.id ? 'Fermer' : 'Modifier'}
                            </button>
                          )}
                          {m.mandateSignStatus !== 'SIGNED' && (
                            <button onClick={() => handleSign(m)} disabled={signingId === m.id} title="Générer le lien de signature" className="p-1 text-[#1F3B2C] hover:opacity-70 disabled:opacity-40"><PenLine className="w-4 h-4" /></button>
                          )}
                          <a href={`/api/mandats/${m.id}/pdf`} target="_blank" rel="noopener noreferrer" title="Mandat PDF" className="p-1 text-[#B89C6D] hover:opacity-70"><FileText className="w-4 h-4" /></a>
                          <button onClick={() => remove(m)} title="Supprimer" className="p-1 text-red-600 hover:opacity-70"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>

                    {signInfo[m.id] && (
                      <tr className="no-print">
                        <td colSpan={10} className="px-3 py-2 bg-amber-50" style={{ borderBottom: '1px solid #eee' }}>
                          <div className="text-xs font-medium mb-2">✍️ Liens de signature — un par mandant ({signInfo[m.id].length}) :</div>
                          <div className="space-y-2">
                            {signInfo[m.id].map((s, si) => (
                              <div key={si} className="flex gap-2 items-center flex-wrap">
                                <span className="text-xs whitespace-nowrap min-w-[140px] font-medium">{s.name || `Mandant ${si + 1}`}{s.signed ? ' ✔' : ''}</span>
                                {s.signed
                                  ? <span className="text-xs text-green-700">Déjà signé</span>
                                  : <>
                                      <input readOnly value={s.url || ''} onFocus={e => e.currentTarget.select()} className="flex-1 min-w-[220px] px-2 py-1 text-xs border rounded bg-white" />
                                      <button onClick={() => navigator.clipboard?.writeText(s.url || '')} className="px-2 py-1 text-xs border rounded hover:bg-white">Copier</button>
                                      {s.emailed
                                        ? <span className="text-xs text-green-700 whitespace-nowrap">✉️ Envoyé à {s.email}</span>
                                        : <span className="text-xs text-gray-500">{s.email ? 'Email non envoyé — copiez le lien' : 'Pas d\'email — copiez le lien'}</span>}
                                    </>}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}

                    {editingId === m.id && (
                      <tr className="no-print">
                        <td colSpan={10} className="px-3 py-3 bg-black/[0.02]" style={{ borderBottom: '1px solid #eee' }}>
                          <div className="grid md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs opacity-60 mb-1">N° de mandat</label>
                              <input value={m.mandateNumber || ''} onChange={e => patchLocal(m.id, { mandateNumber: e.target.value })} className={inputCls} />
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
                            <div className="md:col-span-3 grid md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs opacity-60 mb-1">Désignation du bien</label>
                                <input value={m.designation || ''} onChange={e => patchLocal(m.id, { designation: e.target.value })} placeholder={typeLabel(m)} className={inputCls} />
                              </div>
                              <div>
                                <label className="block text-xs opacity-60 mb-1">Adresse du bien</label>
                                <AddressAutocomplete
                                  value={m.map?.query || ''}
                                  onChange={(c) => patchLocal(m.id, { map: { ...(m.map || {}), query: c.address } })}
                                  onTextChange={(t) => patchLocal(m.id, { map: { ...(m.map || {}), query: t } })}
                                  placeholder="Adresse du bien"
                                  className={inputCls}
                                />
                              </div>
                            </div>
                            <div className="md:col-span-3">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs opacity-60">Mandant(s)</label>
                                <button type="button" onClick={() => addOwner(m)} className="text-xs text-[#B89C6D] hover:underline">+ Ajouter un mandant</button>
                              </div>
                              <div className="space-y-2">
                                {(m.owners && m.owners.length ? m.owners : [{ type: 'INDIVIDUAL' } as Owner]).map((o, oi) => (
                                  <div key={oi} className="border rounded p-2 bg-white">
                                    <div className="flex items-center gap-3 mb-1 text-xs">
                                      <label className="flex items-center gap-1"><input type="radio" checked={o.type !== 'COMPANY'} onChange={() => setOwner(m, oi, { type: 'INDIVIDUAL', name: undefined })} /> Particulier</label>
                                      <label className="flex items-center gap-1"><input type="radio" checked={o.type === 'COMPANY'} onChange={() => setOwner(m, oi, { type: 'COMPANY' })} /> Société</label>
                                      {(m.owners?.length || 0) > 1 && <button type="button" onClick={() => removeOwner(m, oi)} className="ml-auto text-red-600 hover:underline">Retirer</button>}
                                    </div>
                                    {o.type === 'COMPANY' ? (
                                      <div className="space-y-1">
                                        <CompanyAutocomplete
                                          value={o.name || ''}
                                          onSelect={(c) => onCompanySelect(m, oi, c)}
                                          label="Raison sociale (recherche SIREN)"
                                        />
                                        <div className="grid grid-cols-2 gap-1">
                                          <input placeholder="SIREN" value={o.siren || ''} onChange={e => setOwner(m, oi, { siren: e.target.value })} className={inputCls} />
                                          <input placeholder="Forme juridique (SCI, SAS…)" value={o.legalForm || ''} onChange={e => setOwner(m, oi, { legalForm: e.target.value })} className={inputCls} />
                                        </div>
                                        <div className="text-[11px] opacity-60 mt-1">Représentant légal (signataire) :</div>
                                        <div className="grid grid-cols-3 gap-1">
                                          <input placeholder="Prénom" value={o.managerFirstName || ''} onChange={e => setOwner(m, oi, { managerFirstName: e.target.value })} className={inputCls} />
                                          <input placeholder="Nom" value={o.managerLastName || ''} onChange={e => setOwner(m, oi, { managerLastName: e.target.value })} className={inputCls} />
                                          <input placeholder="Qualité (Gérant…)" value={o.managerRole || ''} onChange={e => setOwner(m, oi, { managerRole: e.target.value })} className={inputCls} />
                                        </div>
                                      </div>
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
                                        placeholder={o.type === 'COMPANY' ? 'Adresse du siège social' : 'Adresse du mandant'}
                                        className={inputCls}
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 mt-1">
                                      <input type="email" placeholder={o.type === 'COMPANY' ? 'Email du représentant' : 'Email'} value={o.email || ''} onChange={e => setOwner(m, oi, { email: e.target.value })} className={inputCls} />
                                      <input placeholder="Téléphone" value={o.phone || ''} onChange={e => setOwner(m, oi, { phone: e.target.value })} className={inputCls} />
                                    </div>
                                  </div>
                                ))}
                              </div>
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
                              <label className="block text-xs opacity-60 mb-1">Ville de signature (« Fait à »)</label>
                              <input value={m.mandatePlace || ''} onChange={e => patchLocal(m.id, { mandatePlace: e.target.value })} placeholder={m.city || 'Ville où le mandat est signé'} className={inputCls} />
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button onClick={async () => { await save(m); setEditingId(null); }} disabled={savingId === m.id} className="btn-luxe text-sm flex items-center gap-1 disabled:opacity-60">
                              <Save className="w-3.5 h-3.5" /> {savingId === m.id ? 'Enregistrement…' : 'Enregistrer'}
                            </button>
                            <button onClick={() => { load(); setEditingId(null); }} className="text-sm px-3 py-1.5 border rounded hover:bg-black/5">Annuler</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
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
