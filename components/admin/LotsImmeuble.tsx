"use client";
import {TYPES_LOT,OCCUPATIONS_LOT,type LotImmeuble} from '@/lib/immeuble';

export default function LotsImmeuble({lots,onChange}:{lots:LotImmeuble[];onChange:(lots:LotImmeuble[])=>void}) {
  const modifier=(id:string,values:Partial<LotImmeuble>)=>onChange(lots.map(l=>l.id===id ? {...l,...values}:l));
  return <section className="my-4 rounded border p-4" data-testid="lots-immeuble">
    <h3 className="font-semibold">Lots de l’immeuble — vente en bloc</h3>
    <p className="my-2 text-sm">Ces informations seront publiques. Ne renseignez ni nom de locataire ni donnée personnelle. Les désignations sont descriptives, pas une validation des lots juridiques. La surface totale du bien reste à renseigner séparément ; elle n’est pas calculée automatiquement.</p>
    {lots.map((l,i)=><fieldset key={l.id} className="my-3 grid gap-2 rounded border p-3 md:grid-cols-4">
      <legend>Lot {i+1}</legend>
      <label className="text-sm">Désignation<input className="input w-full" data-testid="lot-label" value={l.label} maxLength={100} onChange={e=>modifier(l.id,{label:e.target.value})} /></label>
      <label className="text-sm">Nature<select className="input w-full" value={l.type} onChange={e=>modifier(l.id,{type:e.target.value as LotImmeuble['type']})}>{Object.entries(TYPES_LOT).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label className="text-sm">Surface (m²)<input className="input w-full" data-testid="lot-surface" type="number" min="0.01" step="0.01" value={l.surface ?? ''} onChange={e=>modifier(l.id,{surface:e.target.value==='' ? undefined:Number(e.target.value)})} /></label>
      <label className="text-sm">Occupation<select className="input w-full" value={l.occupancy} onChange={e=>modifier(l.id,{occupancy:e.target.value as LotImmeuble['occupancy']})}>{Object.entries(OCCUPATIONS_LOT).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <button type="button" className="text-left text-sm text-red-700 underline" onClick={()=>{if(window.confirm(`Retirer le lot « ${l.label || i+1} » ? La suppression sera appliquée à l’enregistrement.`))onChange(lots.filter(x=>x.id!==l.id));}}>Retirer ce lot</button>
    </fieldset>)}
    <button type="button" className="btn" data-testid="ajouter-lot" disabled={lots.length>=50} onClick={()=>onChange([...lots,{id:crypto.randomUUID(),label:`Lot ${lots.length+1}`,type:'APPARTEMENT',occupancy:'INCONNU'}])}>Ajouter un lot</button>
    <p className="mt-2 text-xs">{lots.length} lot(s) renseigné(s), 50 maximum. Un DPE global n’est pas déduit des lots ; renseignez uniquement les diagnostics vérifiés.</p>
  </section>;
}
