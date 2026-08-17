"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

type Item = { image?: string; title?: string };

export default function ProjectionsGallery({ items }: { items: Item[] }) {
  const imgs = (items || []).filter((i) => i && i.image) as Required<Item>[];
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);

  const prev = useCallback(() => setCurrent((c) => (c - 1 + imgs.length) % imgs.length), [imgs.length]);
  const next = useCallback(() => setCurrent((c) => (c + 1) % imgs.length), [imgs.length]);

  // Navigation clavier quand le plein écran est ouvert.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, prev, next]);

  if (!imgs.length) return null;
  const cur = imgs[current];
  const many = imgs.length > 1;

  const Arrow = ({ dir }: { dir: "prev" | "next" }) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); dir === "prev" ? prev() : next(); }}
      aria-label={dir === "prev" ? "Précédent" : "Suivant"}
      className={`absolute top-1/2 -translate-y-1/2 ${dir === "prev" ? "left-3" : "right-3"} z-10 flex items-center justify-center h-10 w-10 rounded-full bg-white/90 hover:bg-white text-[#1F3B2C] shadow-md transition`}
    >
      {dir === "prev" ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
    </button>
  );

  return (
    <>
      {/* Lecteur / carrousel */}
      <div className="relative rounded-2xl overflow-hidden bg-black/5 group">
        <button type="button" onClick={() => setOpen(true)} className="relative block w-full h-[300px] md:h-[460px] cursor-zoom-in" aria-label="Agrandir">
          <Image src={cur.image} alt={cur.title || `Vue ${current + 1}`} fill sizes="(max-width: 768px) 100vw, 66vw" className="object-cover" />
        </button>

        <span className="absolute top-3 right-3 flex items-center justify-center h-8 w-8 rounded-full bg-white/85 text-[#1F3B2C] opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-4 h-4" />
        </span>

        {many && <Arrow dir="prev" />}
        {many && <Arrow dir="next" />}

        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-4 pt-10 pb-3 flex items-end justify-between text-white">
          <span className="text-sm font-medium">{cur.title}</span>
          {many && <span className="text-xs text-white/80">{current + 1} / {imgs.length}</span>}
        </div>
      </div>

      {/* Vignettes */}
      {many && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {imgs.map((im, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Voir ${im.title || `l'image ${i + 1}`}`}
              className={`relative h-14 w-20 shrink-0 rounded-lg overflow-hidden border-2 transition ${i === current ? "border-gold" : "border-transparent opacity-60 hover:opacity-100"}`}
            >
              <Image src={im.image} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Plein écran */}
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 select-none" onClick={() => setOpen(false)} role="dialog" aria-modal="true">
          <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="absolute top-4 right-4 text-white/80 hover:text-white p-2">
            <X className="w-7 h-7" />
          </button>
          {many && (
            <button type="button" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Précédent" className="absolute left-2 md:left-6 text-white/70 hover:text-white p-2">
              <ChevronLeft className="w-9 h-9" />
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cur.image} alt={cur.title || `Vue ${current + 1}`} className="max-h-[85vh] max-w-[92vw] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          {cur.title && <div className="mt-3 text-sm text-white/80">{cur.title}</div>}
          {many && <div className="mt-1 text-xs text-white/40">{current + 1} / {imgs.length}</div>}
          {many && (
            <button type="button" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Suivant" className="absolute right-2 md:right-6 text-white/70 hover:text-white p-2">
              <ChevronRight className="w-9 h-9" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
