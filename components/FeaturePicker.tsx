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
  const [custom, setCustom] = useState('');
  // Prestations personnalisées mémorisées (réutilisables), chargées depuis l'API
  const [savedCustom, setSavedCustom] = useState<string[]>([]);

  useEffect(()=>{ setSelected(value || []); }, [value]);

  useEffect(()=>{
    fetch('/api/features')
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setSavedCustom(d); })
      .catch(()=>{});
  }, []);

  const predefined = useMemo(()=>allFeatures(), []);
  const all = useMemo(()=>[...predefined, ...savedCustom], [predefined, savedCustom]);
  const filtered = useMemo(()=>{
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(f => f.toLowerCase().includes(q));
  }, [all, query]);

  function apply(next: string[]){
    setSelected(next);
    onChange?.(next);
  }

  function toggle(f: string){
    apply(selected.includes(f) ? selected.filter(x=>x!==f) : [...selected, f]);
  }

  function remove(f: string){
    apply(selected.filter(x=>x!==f));
  }

  async function addCustom(){
    const v = custom.trim();
    if (!v) return;
    // Ajouter à la sélection du bien
    if (!selected.some(s => s.toLowerCase() === v.toLowerCase())) {
      apply([...selected, v]);
    }
    // Mémoriser automatiquement pour réutilisation future
    if (!savedCustom.some(s => s.toLowerCase() === v.toLowerCase()) &&
        !predefined.some(s => s.toLowerCase() === v.toLowerCase())) {
      setSavedCustom(prev => [...prev, v]);
      try {
        await fetch('/api/features', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feature: v }),
        });
      } catch { /* la prestation reste dans la sélection même si la mémorisation échoue */ }
    }
    setCustom('');
  }

  // Catégories = prédéfinies + une catégorie « Personnalisées » si présentes
  const categories: Record<string, string[]> = {
    ...FEATURE_CATEGORIES,
    ...(savedCustom.length ? { 'Personnalisées': savedCustom } : {}),
  };

  return (
    <div className="border rounded-2xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <input className="border rounded-2xl px-3 py-2 w-full" placeholder="Rechercher une prestation…" value={query} onChange={e=>setQuery(e.target.value)} />
        <button type="button" className="btn" onClick={()=>apply([])}>Tout désélectionner</button>
      </div>

      {/* Catégories */}
      <div className="grid sm:grid-cols-2 gap-4 max-h-72 overflow-auto pr-1">
        {Object.entries(categories).map(([cat, items])=>{
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

      {/* Ajout d'une prestation personnalisée (mémorisée automatiquement) */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
        <input
          className="border rounded-2xl px-3 py-2 w-full text-sm"
          placeholder="Autre prestation… (ex : Fibre optique)"
          value={custom}
          onChange={e=>setCustom(e.target.value)}
          onKeyDown={e=>{ if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          data-testid="input-custom-feature"
        />
        <button type="button" className="btn btn-gold whitespace-nowrap" onClick={addCustom} data-testid="button-add-feature">
          Ajouter
        </button>
      </div>

      {/* Sélection (puces supprimables) */}
      {selected.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-medium mb-1">Sélection ({selected.length})</div>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((f)=>(
              <span key={f} className="inline-flex items-center gap-1 text-xs bg-gray-100 border rounded-full pl-2.5 pr-1 py-0.5">
                {f}
                <button
                  type="button"
                  onClick={()=>remove(f)}
                  aria-label={`Retirer ${f}`}
                  className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-gray-300 text-gray-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
