'use client';
import { useEffect, useMemo, useState } from 'react';
import { FEATURE_CATEGORIES, allFeatures } from '@/lib/features';

type Props = {
  value?: string[];
  onChange?: (features: string[]) => void;
};

export default function FeaturePicker({ value = [], onChange }: Props){
  const [selected, setSelected] = useState<string[]>(value || []);
  const [query, setQuery] = useState('');

  useEffect(()=>{ setSelected(value || []); }, [value]);

  const all = useMemo(()=>allFeatures(), []);
  const filtered = useMemo(()=>{
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(f => f.toLowerCase().includes(q));
  }, [all, query]);

  function toggle(f: string){
    const exists = selected.includes(f);
    const next = exists ? selected.filter(x=>x!==f) : [...selected, f];
    setSelected(next);
    onChange?.(next);
  }

  return (
    <div className="border rounded-2xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <input className="border rounded-2xl px-3 py-2 w-full" placeholder="Rechercher une prestation…" value={query} onChange={e=>setQuery(e.target.value)} />
        <button type="button" className="btn" onClick={()=>{ setSelected([]); onChange?.([]); }}>Tout désélectionner</button>
      </div>

      {/* Catégories */}
      <div className="grid sm:grid-cols-2 gap-4 max-h-72 overflow-auto pr-1">
        {Object.entries(FEATURE_CATEGORIES).map(([cat, items])=>{
          const itemsToShow = items.filter(i => filtered.includes(i));
          if (!itemsToShow.length) return null;
          return (
            <div key={cat}>
              <div className="font-semibold mb-1">{cat}</div>
              <div className="flex flex-col gap-1">
                {itemsToShow.map((it)=>{
                  const checked = selected.includes(it);
                  return (
                    <label key={it} className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={checked} onChange={()=>toggle(it)} />
                      <span>{it}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sélection */}
      {selected.length > 0 && (
        <div className="mt-3 text-xs opacity-80">
          Sélection : {selected.join(' · ')}
        </div>
      )}
    </div>
  );
}
