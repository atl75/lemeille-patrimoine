"use client";

import { useState, useEffect, useRef } from "react";

type Notary = { name: string; address: string; city: string; siren?: string };

type Props = {
  value: string;
  onSelect: (notary: Notary) => void;
  // Remonte le texte brut à chaque frappe (conserve une saisie libre).
  onTextChange?: (text: string) => void;
  placeholder?: string;
  className?: string;
};

export default function NotaryAutocomplete({ value, onSelect, onTextChange, placeholder, className }: Props) {
  const [q, setQ] = useState(value || "");
  const [results, setResults] = useState<Notary[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const justSelected = useRef(false);

  useEffect(() => { setQ(value || ""); }, [value]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (justSelected.current) { justSelected.current = false; return; }
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/notaires?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const d = await r.json();
        setResults(d.results || []);
        setOpen(true);
      } catch { /* ignore */ } finally { setLoading(false); }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); onTextChange?.(e.target.value); }}
          onFocus={() => { if (results.length) setOpen(true); }}
          placeholder={placeholder}
          className={className || "w-full px-2 py-1 text-xs border rounded"}
        />
        {loading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin h-3 w-3 border-2 border-[#B89C6D] border-t-transparent rounded-full" />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {results.map((n, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                justSelected.current = true;
                setQ(n.name);
                onSelect(n);
                setOpen(false);
                setResults([]);
              }}
              className="w-full px-2 py-1.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="text-xs font-medium truncate">{n.name}</div>
              {n.city && <div className="text-[11px] text-gray-500 truncate">{n.city}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
