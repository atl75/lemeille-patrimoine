"use client";
import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

type Item = { image?: string; title?: string };

export default function ProjectionsGallery({ items }: { items: Item[] }) {
  const imgs = (items || []).filter((i) => i && i.image) as Required<Item>[];
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const prev = useCallback(() => setOpen((o) => (o === null ? o : (o - 1 + imgs.length) % imgs.length)), [imgs.length]);
  const next = useCallback(() => setOpen((o) => (o === null ? o : (o + 1) % imgs.length)), [imgs.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, prev, next]);

  if (!imgs.length) return null;

  return (
    <>
      <div className="grid md:grid-cols-3 gap-5">
        {imgs.map((pl, i) => (
          <figure key={i} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group relative block w-full cursor-zoom-in"
              aria-label={`Agrandir ${pl.title || `l'image ${i + 1}`}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pl.image} alt={pl.title || `Vue ${i + 1}`} className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors">
                <ZoomIn className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </button>
            {pl.title && <figcaption className="p-3 text-sm text-luxe/70">{pl.title}</figcaption>}
          </figure>
        ))}
      </div>

      {open !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 select-none"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button type="button" onClick={close} aria-label="Fermer" className="absolute top-4 right-4 text-white/80 hover:text-white p-2">
            <X className="w-7 h-7" />
          </button>

          {imgs.length > 1 && (
            <button type="button" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Précédent" className="absolute left-2 md:left-6 text-white/70 hover:text-white p-2">
              <ChevronLeft className="w-9 h-9" />
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgs[open].image}
            alt={imgs[open].title || `Vue ${open + 1}`}
            className="max-h-[85vh] max-w-[92vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {imgs[open].title && <div className="mt-3 text-sm text-white/80">{imgs[open].title}</div>}
          {imgs.length > 1 && <div className="mt-1 text-xs text-white/40">{open + 1} / {imgs.length}</div>}

          {imgs.length > 1 && (
            <button type="button" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Suivant" className="absolute right-2 md:right-6 text-white/70 hover:text-white p-2">
              <ChevronRight className="w-9 h-9" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
