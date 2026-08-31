"use client";

import { useCallback, useRef, useState } from "react";
import { cldImg } from "@/lib/cldImg";

export type Paire = { avant?: string; apres?: string; legende?: string };

// Comparateur avant / après : les deux photos sont superposées et un curseur
// révèle l'une ou l'autre. Plus parlant qu'un simple diptyque pour une
// réhabilitation, car l'œil compare le même cadrage au même endroit.
function Comparateur({ paire }: { paire: Paire }) {
  const [pct, setPct] = useState(50);
  const zone = useRef<HTMLDivElement>(null);
  const glisse = useRef(false);

  const majDepuisX = useCallback((clientX: number) => {
    const el = zone.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPct(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  }, []);

  if (!paire.avant || !paire.apres) return null;

  return (
    <figure className="m-0">
      <div
        ref={zone}
        className="relative w-full select-none overflow-hidden rounded-xl border bg-black/5"
        style={{ aspectRatio: "3 / 2", touchAction: "pan-y" }}
        onPointerDown={e => { glisse.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); majDepuisX(e.clientX); }}
        onPointerMove={e => { if (glisse.current) majDepuisX(e.clientX); }}
        onPointerUp={() => { glisse.current = false; }}
        onPointerCancel={() => { glisse.current = false; }}
        data-testid="comparateur-avant-apres"
      >
        {/* Après (fond) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cldImg(paire.apres, 1600)} alt={`Après — ${paire.legende || "réhabilitation"}`}
          loading="lazy" decoding="async" draggable={false}
          className="absolute inset-0 h-full w-full object-cover" />

        {/* Avant (recouvre la partie gauche) */}
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${pct}%` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cldImg(paire.avant, 1600)} alt={`Avant — ${paire.legende || "réhabilitation"}`}
            loading="lazy" decoding="async" draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ width: zone.current ? zone.current.clientWidth : "100%", maxWidth: "none" }} />
        </div>

        {/* Poignée */}
        <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pct}%` }}>
          <div className="h-full w-0.5 bg-white/90 shadow" />
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1F3B2C] shadow-lg">
            ‹ ›
          </div>
        </div>

        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-medium text-white">Avant</span>
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-[#B89C6D] px-2.5 py-1 text-[11px] font-medium text-white">Après</span>

        {/* Accessibilité : la poignée est aussi pilotable au clavier. */}
        <input
          type="range" min={0} max={100} value={pct}
          onChange={e => setPct(Number(e.target.value))}
          aria-label={`Comparer avant et après${paire.legende ? ` — ${paire.legende}` : ""}`}
          className="absolute inset-x-0 bottom-2 mx-auto w-2/3 cursor-pointer accent-[#B89C6D] opacity-0 focus:opacity-100"
        />
      </div>
      {paire.legende && <figcaption className="mt-2 text-sm text-luxe/70">{paire.legende}</figcaption>}
    </figure>
  );
}

export default function AvantApres({ paires }: { paires: Paire[] }) {
  const valides = (paires || []).filter(p => p?.avant && p?.apres);
  if (!valides.length) return null;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {valides.map((p, i) => <Comparateur key={i} paire={p} />)}
    </div>
  );
}
