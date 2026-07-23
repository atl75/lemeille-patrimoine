'use client';
import { useEffect, useState } from 'react';
import Img from '@/components/Img';
type Property = { id:string; title:string; city:string; region:string; price?:number; surface?:number; rooms?:number; description?:string; images?: string[]; features?: string[]; dpe?: any };
export default function Properties({ region }: { region: string }){
  const [items, setItems] = useState<Property[]>([]);
  useEffect(()=>{ fetch('/api/properties').then(r=>r.json()).then(data => { setItems(data.filter((p:any)=>p.region===region)); }); },[region]);
  return (<div className="grid md:grid-cols-2 gap-4">
    {items.map(p => { const cover = (Array.isArray(p.images) && p.images.length) ? p.images[0] : '/logo.png';
      return (<a key={p.id} className="card p-0 hover:border-gold transition" href={`/immobilier/biens/${p.id}`}>
        <Img src={cover} alt={p.title} className="w-full h-56 object-cover rounded-t-2xl" height={224} />
        {(p.images?.length ?? 0) > 1 && (<div className="px-6 pt-2 grid grid-cols-3 gap-2">
          {p.images!.slice(1,4).map((src, i)=>(<Img key={i} src={src} alt={`${p.title} vignette ${i+2}`} className="w-full h-16 object-cover rounded-xl border" height={64} />))}
        </div>)}
        <div className="p-6">
          <h3 className="luxe text-2xl">{p.title}</h3>
          <div className="text-sm opacity-70">{p.city}</div>
          <div className="mt-2 text-sm">Surface: {p.surface ?? '—'} m² · Pièces: {p.rooms ?? '—'}</div>
          {p.price && <div className="mt-2 font-semibold">{p.price.toLocaleString('fr-FR')} €</div>}
          {p.features?.length ? (<div className="mt-3 text-xs opacity-80 line-clamp-1">{p.features.slice(0,3).join(' · ')}</div>) : null}
          {p.dpe && <div className="mt-2 text-xs opacity-70">DPE : {p.dpe.classEnergy} · GES : {p.dpe.classGES}</div>}
        </div>
      </a>); })}
  </div>);
}
