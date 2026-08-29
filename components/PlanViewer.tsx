"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import { cldImg } from "@/lib/cldImg";

const MIN_SCALE = 1;
const MAX_SCALE = 6;

// Visualiseur de plans : vignette cliquable puis plein écran avec zoom.
// Un plan se lit dans le détail (cotes, cloisons) — l'affichage « contenu dans
// l'écran » du lightbox photos ne suffit pas, d'où le zoom molette / pincement
// et le déplacement à la souris ou au doigt.
export default function PlanViewer({ plans, title }: { plans: string[]; title: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const viewport = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const close = useCallback(() => {
    setOpenIndex(null);
    reset();
  }, [reset]);

  const go = useCallback(
    (delta: number) => {
      setOpenIndex((i) => (i === null ? i : (i + delta + plans.length) % plans.length));
      reset();
    },
    [plans.length, reset]
  );

  // Bornes du déplacement : au zoom 1 l'image reste centrée ; au-delà on limite
  // le panoramique à la portion réellement hors cadre, pour ne jamais « perdre »
  // le plan hors de l'écran.
  const clamp = useCallback((o: { x: number; y: number }, s: number) => {
    const el = viewport.current;
    if (!el || s <= 1) return { x: 0, y: 0 };
    const max = { x: (el.clientWidth * (s - 1)) / 2, y: (el.clientHeight * (s - 1)) / 2 };
    return {
      x: Math.max(-max.x, Math.min(max.x, o.x)),
      y: Math.max(-max.y, Math.min(max.y, o.y)),
    };
  }, []);

  const zoomTo = useCallback(
    (next: number) => {
      const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
      setScale(s);
      setOffset((o) => clamp(o, s));
    },
    [clamp]
  );

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight" && plans.length > 1) go(1);
      if (e.key === "ArrowLeft" && plans.length > 1) go(-1);
      if (e.key === "+" || e.key === "=") zoomTo(scale + 0.5);
      if (e.key === "-") zoomTo(scale - 0.5);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [openIndex, close, go, zoomTo, scale, plans.length]);

  // La molette doit zoomer sans faire défiler la page : l'écouteur doit être
  // non passif, ce que l'attribut onWheel de React ne permet pas.
  useEffect(() => {
    const el = viewport.current;
    if (!el || openIndex === null) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomTo(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [openIndex, scale, zoomTo]);

  const src = openIndex !== null ? cldImg(plans[openIndex], 2400) : "";

  return (
    <>
      <div className="grid gap-4">
        {plans.map((plan, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setOpenIndex(i); reset(); }}
            aria-label={`Agrandir le plan ${i + 1}`}
            className="group relative block w-full cursor-zoom-in overflow-hidden rounded-xl border"
            data-testid={`button-plan-${i}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cldImg(plan, 1200)}
              {...(plan.includes("res.cloudinary.com")
                ? { srcSet: `${cldImg(plan, 640)} 640w, ${cldImg(plan, 1200)} 1200w`, sizes: "(max-width: 768px) 100vw, 66vw" }
                : {})}
              alt={`Plan ${i + 1} — ${title}`}
              loading="lazy"
              decoding="async"
              className="w-full h-auto"
            />
            <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white opacity-90 transition-opacity group-hover:opacity-100">
              <Maximize2 className="h-3.5 w-3.5" /> Agrandir
            </span>
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Plan ${openIndex + 1} — ${title}`}
          className="fixed inset-0 z-[60] flex flex-col bg-black/95"
          data-testid="plan-viewer-overlay"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
            <div className="text-sm opacity-80">
              {plans.length > 1 ? `Plan ${openIndex + 1} / ${plans.length}` : "Plan du bien"}
              {scale > 1 && <span className="ml-2 opacity-75">{Math.round(scale * 100)} %</span>}
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => zoomTo(scale / 1.4)} disabled={scale <= MIN_SCALE}
                className="rounded-md p-2 transition-colors hover:text-[#B89C6D] disabled:opacity-30"
                aria-label="Dézoomer" data-testid="button-plan-zoom-out">
                <ZoomOut size={22} />
              </button>
              <button type="button" onClick={reset}
                className="rounded-md px-2 py-2 text-xs transition-colors hover:text-[#B89C6D]"
                aria-label="Réinitialiser le zoom" data-testid="button-plan-zoom-reset">
                Ajuster
              </button>
              <button type="button" onClick={() => zoomTo(scale * 1.4)} disabled={scale >= MAX_SCALE}
                className="rounded-md p-2 transition-colors hover:text-[#B89C6D] disabled:opacity-30"
                aria-label="Zoomer" data-testid="button-plan-zoom-in">
                <ZoomIn size={22} />
              </button>
              <button type="button" onClick={close}
                className="ml-1 rounded-md p-2 transition-colors hover:text-[#B89C6D]"
                aria-label="Fermer" data-testid="button-plan-close">
                <X size={24} />
              </button>
            </div>
          </div>

          <div
            ref={viewport}
            className="relative flex-1 overflow-hidden touch-none select-none"
            style={{ cursor: scale > 1 ? (drag.current ? "grabbing" : "grab") : "zoom-in" }}
            onDoubleClick={() => zoomTo(scale > 1 ? 1 : 2.5)}
            onPointerDown={(e) => {
              if (scale <= 1) return;
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const d = drag.current;
              setOffset(clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }, scale));
            }}
            onPointerUp={() => { drag.current = null; }}
            onPointerCancel={() => { drag.current = null; }}
            onTouchStart={(e) => {
              if (e.touches.length !== 2) return;
              const [a, b] = [e.touches[0], e.touches[1]];
              pinch.current = { dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY), scale };
            }}
            onTouchMove={(e) => {
              if (e.touches.length !== 2 || !pinch.current) return;
              const [a, b] = [e.touches[0], e.touches[1]];
              const d = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
              zoomTo(pinch.current.scale * (d / pinch.current.dist));
            }}
            onTouchEnd={() => { pinch.current = null; }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Plan ${openIndex + 1} — ${title}`}
              draggable={false}
              className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transition: drag.current || pinch.current ? "none" : "transform .18s ease-out",
              }}
              data-testid="plan-viewer-image"
            />

            {plans.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:text-[#B89C6D]"
                  aria-label="Plan précédent" data-testid="button-plan-prev">
                  <ChevronLeft size={32} />
                </button>
                <button type="button" onClick={() => go(1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:text-[#B89C6D]"
                  aria-label="Plan suivant" data-testid="button-plan-next">
                  <ChevronRight size={32} />
                </button>
              </>
            )}
          </div>

          <p className="px-4 py-3 text-center text-xs text-white/45">
            Molette ou pincement pour zoomer · double-clic pour ajuster · glisser pour déplacer · Échap pour fermer
          </p>
        </div>
      )}
    </>
  );
}
