"use client";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import { useEffect, useMemo, useState } from "react";

type Prop = any;
type LinkedProp = { id: string; label: string; city?: string; price?: number; status: string };
type Person = { name: string; email?: string; phone?: string; address?: string; company?: boolean; prospect?: boolean; source?: string; note?: string; properties: LinkedProp[] };

const SRC_LABEL: Record<string, string> = {
  'contact-form': 'Contact', 'estimation-immobilier': 'Estimation', 'simulateur-defiscalisation': 'Simulateur',
  'guide-defiscalisation': 'Guide', 'seloger': 'SeLoger', 'leboncoin': 'LeBonCoin',
};
const srcLabel = (s?: string) => s ? (SRC_LABEL[s] || s) : '';
type Notary = { officeName: string; notaryName?: string; phone?: string; email?: string; clerkName?: string; clerkEmail?: string; properties: LinkedProp[] };

const eur = (n?: number) => (n || n === 0) ? Math.round(Number(n)).toLocaleString("fr-FR") + " €" : "—";
const typeLabel = (p: Prop) => ((p.type || "APPARTEMENT") === "MAISON" ? "Maison" : "Appartement") + (p.rooms ? ` T${p.rooms}` : "");
const statusLabel = (p: Prop) => p.status === "SOLD" || p.sold ? "Vendu" : p.status === "UNDER_OFFER" ? "Sous promesse" : p.status === "OFFER_RECEIVED" ? "Sous offre" : "En vente";
const propLabel = (p: Prop) => p.title || typeLabel(p);

export default function Page() {
  const [props, setProps] = useState<Prop[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [notaryBook, setNotaryBook] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"sellers" | "buyers" | "notaries">("sellers");
  const [q, setQ] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/properties").then(r => r.json()).catch(() => []),
      fetch("/api/leads").then(r => r.json()).catch(() => []),
      fetch("/api/notary-contacts").then(r => r.json()).catch(() => ({ contacts: [] })),
    ]).then(([p, l, n]) => {
      setProps(Array.isArray(p) ? p : []);
      setLeads(Array.isArray(l) ? l : []);
      setNotaryBook(Array.isArray(n?.contacts) ? n.contacts : []);
      setLoading(false);
    });
  }, []);

  // Résumé des critères de recherche d'un lead acheteur.
  const criteria = (l: any) => {
    const c = l.buyerCriteria || {};
    const parts = [
      (c.budgetMin || c.budgetMax) ? `Budget ${c.budgetMin ? Math.round(c.budgetMin / 1000) + 'k' : ''}${c.budgetMax ? '–' + Math.round(c.budgetMax / 1000) + 'k€' : '€'}` : '',
      c.sector, c.type, c.roomsMin ? `${c.roomsMin}+ pièces` : '', c.surfaceMin ? `${c.surfaceMin}+ m²` : '',
    ].filter(Boolean);
    return parts.join(' · ');
  };

  const linked = (p: Prop): LinkedProp => ({ id: p.id, label: propLabel(p), city: p.city, price: p.finalSalePrice ?? p.price, status: statusLabel(p) });

  const sellers = useMemo<Person[]>(() => {
    const map = new Map<string, Person>();
    for (const p of props) {
      for (const o of (p.owners || [])) {
        const isCo = o.type === "COMPANY";
        const name = isCo ? (o.name || "") : [o.firstName, o.lastName].filter(Boolean).join(" ");
        if (!name && !o.email && !o.phone) continue;
        const key = (o.email || o.phone || name).toString().toLowerCase().trim();
        if (!map.has(key)) map.set(key, { name, email: o.email, phone: o.phone, address: o.address, company: isCo, properties: [] });
        const per = map.get(key)!;
        per.email = per.email || o.email; per.phone = per.phone || o.phone; per.address = per.address || o.address;
        per.properties.push(linked(p));
      }
    }
    // Prospects vendeurs (leads role VENDEUR non encore liés à un bien).
    for (const l of leads) {
      if ((l.role || "ACHETEUR") !== "VENDEUR") continue;
      const isCo = !!l.company;
      const name = isCo ? (l.companyName || "") : [l.firstName, l.lastName].filter(Boolean).join(" ");
      if (!name && !l.email && !l.phone) continue;
      const key = (l.email || l.phone || name).toString().toLowerCase().trim();
      if (map.has(key)) { const per = map.get(key)!; per.email = per.email || l.email; per.phone = per.phone || l.phone; }
      else map.set(key, { name, email: l.email, phone: l.phone, address: l.address, company: isCo, prospect: true, source: l.source, note: l.topic || l.message, properties: [] });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [props, leads]);

  const buyers = useMemo<Person[]>(() => {
    const map = new Map<string, Person>();
    for (const p of props) {
      const name = [p.buyerFirstName, p.buyerLastName].filter(Boolean).join(" ");
      if (!name && !p.buyerEmail && !p.buyerPhone) continue;
      const key = (p.buyerEmail || p.buyerPhone || name).toString().toLowerCase().trim();
      if (!map.has(key)) map.set(key, { name, email: p.buyerEmail, phone: p.buyerPhone, address: p.buyerAddress, properties: [] });
      const per = map.get(key)!;
      per.email = per.email || p.buyerEmail; per.phone = per.phone || p.buyerPhone; per.address = per.address || p.buyerAddress;
      per.properties.push(linked(p));
    }
    // Prospects acheteurs (leads role ACHETEUR non encore liés à un bien).
    for (const l of leads) {
      if ((l.role || "ACHETEUR") !== "ACHETEUR") continue;
      const name = [l.firstName, l.lastName].filter(Boolean).join(" ");
      if (!name && !l.email && !l.phone) continue;
      const key = (l.email || l.phone || name).toString().toLowerCase().trim();
      if (map.has(key)) { const per = map.get(key)!; per.email = per.email || l.email; per.phone = per.phone || l.phone; }
      else map.set(key, { name, email: l.email, phone: l.phone, address: l.address, prospect: true, source: l.source, note: criteria(l) || l.topic || l.message, properties: [] });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [props, leads]);

  const notaries = useMemo<Notary[]>(() => {
    const norm = (s?: string) => (s || "").toLowerCase().trim();
    const map = new Map<string, Notary>();
    for (const c of notaryBook) {
      if (!c.officeName) continue;
      map.set(norm(c.officeName), { officeName: c.officeName, notaryName: c.notaryName, phone: c.phone, email: c.email, clerkName: c.clerkName, clerkEmail: c.clerkEmail, properties: [] });
    }
    // Rattache les biens à chaque office (notaire vendeur ou acquéreur) + ajoute les offices absents du carnet.
    for (const p of props) {
      for (const key of ["sellerNotary", "buyerNotary"] as const) {
        const n = p[key];
        if (!n?.officeName) continue;
        const k = norm(n.officeName);
        if (!map.has(k)) map.set(k, { officeName: n.officeName, notaryName: n.notaryName, phone: n.phone, email: n.email, properties: [] });
        map.get(k)!.properties.push(linked(p));
      }
    }
    return [...map.values()].sort((a, b) => a.officeName.localeCompare(b.officeName, "fr"));
  }, [notaryBook, props]);

  const match = (hay: string) => !q.trim() || hay.toLowerCase().includes(q.toLowerCase().trim());
  const fSellers = sellers.filter(s => match([s.name, s.email, s.phone, s.address].filter(Boolean).join(" ")));
  const fBuyers = buyers.filter(s => match([s.name, s.email, s.phone, s.address].filter(Boolean).join(" ")));
  const fNotaries = notaries.filter(n => match([n.officeName, n.notaryName, n.email, n.phone, n.clerkName, n.clerkEmail].filter(Boolean).join(" ")));

  const PropChips = ({ items }: { items: LinkedProp[] }) => (
    <div className="flex flex-wrap gap-1">
      {items.map((it, i) => (
        <a key={i} href={`/admin/contenu/biens?edit=${it.id}`} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-[#B89C6D]/40 hover:bg-[#B89C6D]/10" title={`${it.label}${it.city ? ' — ' + it.city : ''} · ${eur(it.price)}`}>
          <span className="truncate max-w-[180px]">{it.label}</span>
          <span className={`px-1 rounded text-[10px] ${it.status === 'Vendu' ? 'bg-red-100 text-red-700' : it.status === 'Sous promesse' ? 'bg-orange-100 text-orange-700' : it.status === 'Sous offre' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'}`}>{it.status}</span>
        </a>
      ))}
      {!items.length && <span className="text-xs opacity-75">—</span>}
    </div>
  );

  const Contact = ({ email, phone, address }: { email?: string; phone?: string; address?: string }) => (
    <div className="text-xs text-gray-600 space-y-0.5">
      {phone && <div>📞 <a href={`tel:${phone}`} className="hover:underline">{phone}</a></div>}
      {email && <div>✉️ <a href={`mailto:${email}`} className="hover:underline">{email}</a></div>}
      {address && <div className="opacity-70">{address}</div>}
      {!phone && !email && !address && <span className="opacity-75">—</span>}
    </div>
  );

  const tabs: [typeof tab, string, number][] = [
    ["sellers", "Vendeurs", sellers.length],
    ["buyers", "Acquéreurs", buyers.length],
    ["notaries", "Notaires", notaries.length],
  ];

  return (
    <AdminShell title="Répertoire">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Administration", href: "/admin" }, { label: "Répertoire" }]} />

      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map(([key, label, n]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded text-sm ${tab === key ? "bg-[#1F3B2C] text-white" : "border hover:bg-black/5"}`} data-testid={`tab-${key}`}>
            {label} <span className="opacity-70">({n})</span>
          </button>
        ))}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher (nom, email, téléphone…)" className="input flex-1 min-w-[220px]" data-testid="input-directory-search" />
      </div>

      {loading && <div className="card p-6 opacity-70">Chargement…</div>}

      {!loading && (tab === "sellers" || tab === "buyers") && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1F3B2C] text-white text-left">
                <th className="px-3 py-2">{tab === "sellers" ? "Vendeur" : "Acquéreur"}</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">{tab === "sellers" ? "Biens vendus / en vente" : "Biens achetés"}</th>
              </tr>
            </thead>
            <tbody>
              {(tab === "sellers" ? fSellers : fBuyers).map((p, i) => (
                <tr key={i} className={i % 2 ? "bg-black/[0.03]" : ""} style={{ borderBottom: "1px solid #eee" }}>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">
                    {p.name || "—"}
                    {p.company && <span className="ml-1 text-[10px] px-1 rounded bg-purple-100 text-purple-700">société</span>}
                    {p.prospect && <span className="ml-1 text-[10px] px-1 rounded bg-amber-100 text-amber-700">prospect{p.source ? ` · ${srcLabel(p.source)}` : ''}</span>}
                  </td>
                  <td className="px-3 py-2"><Contact email={p.email} phone={p.phone} address={p.address} /></td>
                  <td className="px-3 py-2">
                    {p.properties.length ? <PropChips items={p.properties} /> : (p.note ? <span className="text-xs opacity-70 italic">{p.note}</span> : <span className="text-xs opacity-75">—</span>)}
                  </td>
                </tr>
              ))}
              {!(tab === "sellers" ? fSellers : fBuyers).length && (
                <tr><td colSpan={3} className="px-3 py-6 text-center opacity-75">Aucun résultat.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === "notaries" && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1F3B2C] text-white text-left">
                <th className="px-3 py-2">Office</th>
                <th className="px-3 py-2">Notaire</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Clerc</th>
                <th className="px-3 py-2">Dossiers</th>
              </tr>
            </thead>
            <tbody>
              {fNotaries.map((n, i) => (
                <tr key={i} className={i % 2 ? "bg-black/[0.03]" : ""} style={{ borderBottom: "1px solid #eee" }}>
                  <td className="px-3 py-2 font-medium">{n.officeName}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{n.notaryName || "—"}</td>
                  <td className="px-3 py-2"><Contact email={n.email} phone={n.phone} /></td>
                  <td className="px-3 py-2 text-xs">{n.clerkName || n.clerkEmail ? <>{n.clerkName || ""}{n.clerkEmail && <div>✉️ <a href={`mailto:${n.clerkEmail}`} className="hover:underline">{n.clerkEmail}</a></div>}</> : <span className="opacity-75">—</span>}</td>
                  <td className="px-3 py-2"><PropChips items={n.properties} /></td>
                </tr>
              ))}
              {!fNotaries.length && (
                <tr><td colSpan={5} className="px-3 py-6 text-center opacity-75">Aucun notaire enregistré.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs opacity-75 mt-3">
        Répertoire construit automatiquement à partir des fiches biens (propriétaires = vendeurs, acquéreurs) et du carnet de contacts notaires. Cliquez sur un bien pour ouvrir sa fiche.
      </p>
    </AdminShell>
  );
}
