"use client";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import { useEffect, useState } from "react";

type Mandat = { id: string; mandateNumber?: string; title?: string; designation?: string; mandateSignStatus?: string };
type Delegation = { id: string; mandatId: string; mandateNumber: string; propertyTitle: string; partnerName: string; partnerSiren?: string; partnerCard?: string; startDate?: string; endDate?: string; feeSharePercent?: number; status: string; history?: {date: string; status: string; action: string}[] };
const statuses = ["BROUILLON", "A_SIGNER", "ACTIVE", "EXPIREE", "REVOQUEE"];
const labels: Record<string,string> = { BROUILLON:"Brouillon", A_SIGNER:"À signer", ACTIVE:"Active", EXPIREE:"Expirée", REVOQUEE:"Révoquée" };
const empty = { mandatId:"", partnerName:"", partnerSiren:"", partnerCard:"", partnerAddress:"", partnerEmail:"", partnerPhone:"", representative:"", territory:"", scope:"", startDate:"", endDate:"", feeSharePercent:50, feeNotes:"", status:"BROUILLON" };

export default function Page() {
 const [mandats,setMandats] = useState<Mandat[]>([]);
 const [delegations,setDelegations] = useState<Delegation[]>([]);
 const [form,setForm] = useState(empty);
 const [busy,setBusy] = useState(false);
 const [error,setError] = useState("");
 const [ready,setReady] = useState(false);
 const reload = async () => {
   try {
     const [a,b] = await Promise.all([fetch("/api/mandats",{cache:"no-store"}),fetch("/api/mandats/delegations",{cache:"no-store"})]);
     if (!a.ok || !b.ok) throw Error("Accès refusé ou données indisponibles");
     setMandats(await a.json()); setDelegations(await b.json()); setReady(true);
   } catch(e:any) { setError(e.message || "Erreur de chargement"); }
 };
 useEffect(() => { reload(); const id=new URLSearchParams(window.location.search).get("mandat"); if(id) setForm(f=>({...f,mandatId:id})); },[]);
 const field = (key:keyof typeof empty,label:string,type="text") =>
   <label className="grid gap-1 text-sm" key={key}><span className="font-medium">{label}</span>
   <input className="border rounded-lg p-3 w-full bg-white" type={type} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:key==="feeSharePercent"?Number(e.target.value):e.target.value}))}/></label>;
 const submit = async (e:React.FormEvent) => {
  e.preventDefault(); setBusy(true); setError("");
  try { const r=await fetch("/api/mandats/delegations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    const data=await r.json(); if(!r.ok) throw Error(data.error || "Enregistrement impossible");
    setForm(empty); await reload();
  } catch(e:any) { setError(e.message); } finally {setBusy(false);}
 };
 const changeStatus=async (d:Delegation,status:string)=>{
  setError("");try { const r=await fetch("/api/mandats/delegations",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:d.id,status})});const j=await r.json();if(!r.ok)throw Error(j.error||"Modification impossible");await reload(); } catch(e:any){setError(e.message);}
 };
 return <AdminShell title="Délégations partenaires" wide>
  <Breadcrumb items={[{label:"Administration",href:"/admin"},{label:"Registre des mandats",href:"/admin/mandats"},{label:"Délégations partenaires"}]}/>
  <p className="mb-5 text-sm text-gray-700">Délégations rattachées aux mandats d&apos;origine. Un brouillon ne constitue pas un accord signé. Vérifiez les habilitations, le mandat d&apos;origine et les conditions de partage d&apos;honoraires avant activation.</p>
  {error&&<p role="alert" className="p-3 border border-red-400 text-red-700 bg-red-50 rounded mb-4">{error}</p>}
  <div className="grid xl:grid-cols-[minmax(330px,0.9fr)_minmax(500px,1.4fr)] gap-7 items-start">
   <form onSubmit={submit} className="card p-6 space-y-4">
    <h2 className="text-2xl luxe">Créer une délégation</h2>
    <label className="grid gap-1 text-sm"><span>Mandat d&apos;origine *</span><select required className="border rounded-lg p-3 bg-white" value={form.mandatId} onChange={e=>setForm(f=>({...f,mandatId:e.target.value}))}>
     <option value="">Choisir un mandat</option>{mandats.map(m=><option value={m.id} key={m.id}>{m.mandateNumber || m.id} — {m.title || m.designation || "Bien"} {m.mandateSignStatus==="SIGNED"?"(signé)":"(non signé)"}</option>)}
    </select></label>
    {field("partnerName","Raison sociale du partenaire *")}
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
    <button disabled={busy} className="btn-luxe disabled:opacity-50">{busy?"Enregistrement…":"Enregistrer la délégation"}</button>
   </form>
   <div className="card p-6 overflow-x-auto">
    <h2 className="text-2xl luxe mb-4">Délégations enregistrées ({delegations.length})</h2>
    {!ready&&<p>Chargement…</p>}
    {ready&&delegations.length===0&&<p className="text-gray-600">Aucune délégation pour le moment.</p>}
    {delegations.map(d=><article key={d.id} className="py-4 border-b space-y-2">
     <div className="flex flex-wrap justify-between gap-2"><div><strong>{d.partnerName}</strong><p className="text-sm">{d.mandateNumber} — {d.propertyTitle}</p></div><span className="text-sm font-semibold">{labels[d.status]||d.status}</span></div>
     <p className="text-sm">SIREN : {d.partnerSiren||"—"} · CPI : {d.partnerCard||"—"} · Partenaire : {d.feeSharePercent??0}% des honoraires</p>
     <p className="text-sm">Période : {d.startDate||"—"} au {d.endDate||"—"}</p>
     <div className="flex flex-wrap gap-3 items-center"><a className="underline text-[#1F3B2C] font-medium text-sm" target="_blank" rel="noopener noreferrer" href={`/api/mandats/delegations/pdf?id=${encodeURIComponent(d.id)}`}>Télécharger le projet PDF</a>
      <select aria-label={`Statut de ${d.partnerName}`} className="border rounded p-2 text-sm" value={d.status} onChange={e=>changeStatus(d,e.target.value)}>{statuses.map(x=><option key={x} value={x}>{labels[x]}</option>)}</select>
     </div>
     <details className="text-xs text-gray-600"><summary>Historique ({d.history?.length||0})</summary>{(d.history||[]).map((h,i)=><p key={i}>{new Date(h.date).toLocaleString("fr-FR")} : {h.action} — {labels[h.status]||h.status}</p>)}</details>
    </article>)}
   </div>
  </div>
 </AdminShell>;
}
