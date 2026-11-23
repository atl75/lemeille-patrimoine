"use client";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import { useEffect, useState } from "react";
import { delegationVide as empty, formulaireDelegation, derniereDelegationPourMandat } from "@/lib/delegationForm";

type Mandat = { id: string; mandateNumber?: string; title?: string; designation?: string; mandateSignStatus?: string };
type Delegation = ReturnType<typeof formulaireDelegation> & { id: string; mandateNumber?: string; propertyTitle?: string; updatedAt?: string; createdAt?: string; history?: {date: string; status: string; action: string}[] };
const statuses = ["BROUILLON", "A_SIGNER", "ACTIVE", "EXPIREE", "REVOQUEE"];
const labels: Record<string,string> = { BROUILLON:"Brouillon", A_SIGNER:"À signer", ACTIVE:"Active", EXPIREE:"Expirée", REVOQUEE:"Révoquée" };


export default function Page() {
 const [mandats,setMandats] = useState<Mandat[]>([]);
 const [delegations,setDelegations] = useState<Delegation[]>([]);
 const [form,setForm] = useState(empty);
 const [editing,setEditing] = useState<Delegation|null>(null);
 const [savedForm,setSavedForm] = useState(JSON.stringify(empty));
 const [message,setMessage] = useState('');
 const loadForm = (d:Delegation|null, mandatId='') => {
   const next=d?formulaireDelegation(d):{...empty,mandatId};
   setForm(next);setSavedForm(JSON.stringify(next));setEditing(d);
 };
 const choose = (d:Delegation|null, mandatId='') => {
   if(JSON.stringify(form)!==savedForm && !window.confirm('Remplacer les modifications non enregistrées ?'))return;
   loadForm(d,mandatId);setMessage('');setError('');
 };
 const [busy,setBusy] = useState(false);
 const [error,setError] = useState("");
 const [ready,setReady] = useState(false);
 const reload = async (prefillMandat?:string) => {
   try {
     const [a,b] = await Promise.all([fetch("/api/mandats",{cache:"no-store"}),fetch("/api/mandats/delegations",{cache:"no-store"})]);
     if (!a.ok || !b.ok) throw Error("Accès refusé ou données indisponibles");
     const records:Delegation[]=await b.json();setMandats(await a.json()); setDelegations(records); setReady(true);
     if(prefillMandat)loadForm(derniereDelegationPourMandat(records,prefillMandat)||null,prefillMandat);
   } catch(e:any) { setError(e.message || "Erreur de chargement"); }
 };
 useEffect(() => { const id=new URLSearchParams(window.location.search).get("mandat"); reload(id||undefined); },[]);
 const field = (key:keyof typeof empty,label:string,type="text") =>
   <label className="grid gap-1 text-sm" key={key}><span className="font-medium">{label}</span>
   <input className="border rounded-lg p-3 w-full bg-white" type={type} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:key==="feeSharePercent"?Number(e.target.value):e.target.value}))}/></label>;
 const submit = async (e:React.FormEvent) => {
  e.preventDefault(); if(busy)return; setBusy(true); setError("");setMessage("");
  try { const r=await fetch("/api/mandats/delegations",{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(editing?{...form,id:editing.id,expectedUpdatedAt:editing.updatedAt||""}:form)});
    const data=await r.json(); if(!r.ok) throw Error(data.error || "Enregistrement impossible");
    loadForm(data.item||data);setMessage("Informations enregistrées. Le PDF reprend cette version."); await reload();
  } catch(e:any) { setError(e.message); } finally {setBusy(false);}
 };
 const changeStatus=async (d:Delegation,status:string)=>{
  if(busy)return;
  setBusy(true);setError('');
  try {
    const r=await fetch('/api/mandats/delegations',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:d.id,status,expectedUpdatedAt:d.updatedAt||''})});
    const j=await r.json();if(!r.ok)throw Error(j.error||'Modification impossible');
    if(editing?.id===d.id){setEditing(j.item);setForm(f=>({...f,status}));setSavedForm(old=>JSON.stringify({...JSON.parse(old),status}));}
    await reload();
  }catch(e:any){setError(e.message);}finally{setBusy(false);}
 };

 return <AdminShell title="Délégations partenaires" wide>
  <Breadcrumb items={[{label:"Administration",href:"/admin"},{label:"Registre des mandats",href:"/admin/mandats"},{label:"Délégations partenaires"}]}/>
  <p className="mb-5 text-sm text-gray-700">Délégations rattachées aux mandats d&apos;origine. Un brouillon ne constitue pas un accord signé. Vérifiez les habilitations, le mandat d&apos;origine et les conditions de partage d&apos;honoraires avant activation.</p>
  {message&&<p role="status" className="p-3 mb-4 bg-green-50 text-green-900 rounded">{message}</p>}
  {error&&<p role="alert" className="p-3 border border-red-400 text-red-700 bg-red-50 rounded mb-4">{error}</p>}
  <div className="grid xl:grid-cols-[minmax(330px,0.9fr)_minmax(500px,1.4fr)] gap-7 items-start">
   <form onSubmit={submit} className="card p-6 space-y-4">
    <h2 className="text-2xl luxe">{editing?'Modifier la délégation':'Créer une délégation'}</h2>
    {editing&&<p className="text-sm text-gray-600">Informations enregistrées de {editing.partnerName}, reprises dans le PDF. <button type="button" disabled={busy} className="underline" onClick={()=>choose(null,form.mandatId)}>Créer une autre délégation</button></p>}
    <fieldset disabled={busy||!ready} className="space-y-4 disabled:opacity-60">
    <label className="grid gap-1 text-sm"><span>Mandat d&apos;origine *</span><select required className="border rounded-lg p-3 bg-white" value={form.mandatId} onChange={e=>choose(derniereDelegationPourMandat(delegations,e.target.value)||null,e.target.value)} disabled={!!editing}>
     <option value="">Choisir un mandat</option>{mandats.map(m=><option value={m.id} key={m.id}>{m.mandateNumber || m.id} — {m.title || m.designation || "Bien"} {m.mandateSignStatus==="SIGNED"?"(signé)":"(non signé)"}</option>)}
    </select></label>
    {field("partnerName","Raison sociale du partenaire *")}
    {field("partnerTradeName","Enseigne du partenaire")}
    <div className="grid md:grid-cols-2 gap-3">{field("partnerSiren","SIREN (9 chiffres)")}{field("partnerCard","Carte professionnelle / CPI")}</div>
    {field("representative","Représentant légal")}
    {field("partnerAddress","Adresse du partenaire")}
    <div className="grid md:grid-cols-2 gap-3">{field("partnerEmail","Email","email")}{field("partnerPhone","Téléphone","tel")}</div>
    {field("territory","Secteur géographique")}
    <label className="grid gap-1 text-sm"><span>Périmètre de la délégation</span><textarea className="border rounded-lg p-3 w-full" rows={3} value={form.scope} onChange={e=>setForm(f=>({...f,scope:e.target.value}))}/></label>
    <div className="grid md:grid-cols-2 gap-3">{field("startDate","Date de début","date")}{field("endDate","Date de fin","date")}</div>
    {field("feeSharePercent","Part des honoraires revenant au partenaire (%)","number")}
    <label className="grid gap-1 text-sm"><span>Conditions et honoraires</span><textarea className="border rounded-lg p-3 w-full" rows={3} value={form.feeNotes} onChange={e=>setForm(f=>({...f,feeNotes:e.target.value}))}/></label>
    <label className="grid gap-1 text-sm"><span>Statut</span><select className="border rounded-lg p-3" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>{statuses.map(x=><option key={x} value={x}>{labels[x]}</option>)}</select></label>
    <button disabled={busy} className="btn-luxe disabled:opacity-50">{busy?"Enregistrement…":editing?"Enregistrer les modifications":"Enregistrer la délégation"}</button>
    </fieldset>
   </form>
   <div className="card p-6 overflow-x-auto">
    <h2 className="text-2xl luxe mb-4">Délégations enregistrées ({delegations.length})</h2>
    {!ready&&<p>Chargement…</p>}
    {ready&&delegations.length===0&&<p className="text-gray-600">Aucune délégation pour le moment.</p>}
    {delegations.map(d=><article key={d.id} className="py-4 border-b space-y-2">
     <div className="flex flex-wrap justify-between gap-2"><div><strong>{d.partnerName}</strong><p className="text-sm">{d.mandateNumber} — {d.propertyTitle}</p></div><span className="text-sm font-semibold">{labels[d.status]||d.status}</span></div>
     <p className="text-sm">SIREN : {d.partnerSiren||"—"} · CPI : {d.partnerCard||"—"} · Partenaire : {d.feeSharePercent??0}% des honoraires</p>
     <p className="text-sm">Période : {d.startDate||"—"} au {d.endDate||"—"}</p>
     <p className="text-xs text-gray-600">Signature Novus Capital, Arthur Lemeille et date du jour (heure de Paris) ajoutés au téléchargement. Le délégataire complète et signe son cadre. Le téléchargement ne change pas le statut de la délégation.</p>
     <div className="flex flex-wrap gap-3 items-center"><button type="button" disabled={busy} className="underline text-sm font-medium" onClick={()=>choose(d)}>Modifier les informations</button><a className="underline text-[#1F3B2C] font-medium text-sm" target="_blank" rel="noopener noreferrer" href={`/api/mandats/delegations/pdf?id=${encodeURIComponent(d.id)}`}>Télécharger le PDF à compléter et signer</a>
      <select disabled={busy} aria-label={`Statut de ${d.partnerName}`} className="border rounded p-2 text-sm" value={d.status} onChange={e=>changeStatus(d,e.target.value)}>{statuses.map(x=><option key={x} value={x}>{labels[x]}</option>)}</select>
     </div>
     <details className="text-xs text-gray-600"><summary>Historique ({d.history?.length||0})</summary>{(d.history||[]).map((h,i)=><p key={i}>{new Date(h.date).toLocaleString("fr-FR")} : {h.action} — {labels[h.status]||h.status}</p>)}</details>
    </article>)}
   </div>
  </div>
 </AdminShell>;
}
