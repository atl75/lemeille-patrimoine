"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, Loader2 } from "lucide-react";

// Lecteur de document à signer.
//
// Pourquoi ne pas utiliser une <iframe> : iOS Safari refuse d'afficher un PDF
// dans une iframe (zone blanche), ce qui rendait la lecture impossible sur
// iPhone. On rend donc les pages nous-mêmes avec pdf.js, ce qui permet en outre
// de savoir quand le lecteur a réellement atteint la fin du document.
//
// Hauteur en dvh et non vh : sur iPhone la barre d'adresse fait varier la
// hauteur visible, et 100vh déborde sous l'interface de Safari.

type Props = {
  url: string;
  title: string;
  onAcknowledge: () => void;
  onClose: () => void;
  acknowledgeLabel?: string;
};

export default function DocumentReader({
  url,
  title,
  onAcknowledge,
  onClose,
  acknowledgeLabel = "Je reconnais avoir lu et pris connaissance de l'intégralité du document.",
}: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const pagesHost = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<any>(null);
  const renderToken = useRef(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [checked, setChecked] = useState(false);

  // Rendu de toutes les pages à la largeur du conteneur. Rappelé au changement
  // d'orientation et de zoom ; le jeton annule un rendu devenu obsolète.
  const render = useCallback(async () => {
    const pdf = pdfRef.current;
    const host = pagesHost.current;
    if (!pdf || !host) return;
    const token = ++renderToken.current;

    const width = (scroller.current?.clientWidth || 360) - 24;
    const frag = document.createElement("div");

    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      if (token !== renderToken.current) return;
      const base = page.getViewport({ scale: 1 });
      const scale = ((width * zoom) / base.width) * Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${width * zoom}px`;
      canvas.style.height = "auto";
      canvas.style.display = "block";
      canvas.style.margin = "0 auto 12px";
      canvas.style.background = "#fff";
      canvas.style.borderRadius = "4px";
      canvas.style.boxShadow = "0 1px 8px rgba(0,0,0,.35)";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", `Page ${n} sur ${pdf.numPages}`);

      await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
      if (token !== renderToken.current) return;
      frag.appendChild(canvas);
    }

    if (token !== renderToken.current) return;
    host.replaceChildren(frag);
    setLoading(false);
  }, [zoom]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs: any = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        // Nos PDF n'embarquent pas leurs polices (Helvetica, Times standard).
        // Sans standardFontDataUrl, pdf.js ne peut pas charger les polices de
        // substitution et les caractères accentués sont rendus de travers.
        const pdf = await pdfjs.getDocument({
          url,
          standardFontDataUrl: "/pdfjs/standard_fonts/",
        }).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        await render();
      } catch (e) {
        if (!cancelled) {
          setError("Le document n'a pas pu être affiché.");
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    if (pdfRef.current) render();
  }, [zoom, render]);

  // Rotation de l'appareil : la largeur disponible change, il faut re-rendre.
  useEffect(() => {
    let t: any;
    const onResize = () => { clearTimeout(t); t = setTimeout(() => { if (pdfRef.current) render(); }, 180); };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [render]);

  // Fin de lecture : on tolère 40 px pour ne pas piéger le lecteur au pixel près.
  const onScroll = () => {
    const el = scroller.current;
    if (!el || reachedEnd) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setReachedEnd(true);
  };

  // Document plus court que l'écran : il n'y a rien à faire défiler.
  useEffect(() => {
    const el = scroller.current;
    if (!loading && el && el.scrollHeight <= el.clientHeight + 40) setReachedEnd(true);
  }, [loading, numPages, zoom]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex flex-col bg-[#12241b]"
      style={{ height: "100dvh" }}
      data-testid="document-reader"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 bg-[#1F3B2C] px-3 py-2.5 text-white">
        <span className="truncate text-sm font-medium">{title}</span>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => setZoom(z => Math.max(0.6, z - 0.25))} disabled={zoom <= 0.6}
            className="rounded p-2 disabled:opacity-30" aria-label="Réduire" data-testid="button-doc-zoom-out">
            <ZoomOut size={18} />
          </button>
          <span className="w-10 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom(z => Math.min(3, z + 0.25))} disabled={zoom >= 3}
            className="rounded p-2 disabled:opacity-30" aria-label="Agrandir" data-testid="button-doc-zoom-in">
            <ZoomIn size={18} />
          </button>
          <button type="button" onClick={onClose} className="rounded p-2" aria-label="Fermer" data-testid="button-doc-close">
            <X size={20} />
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex-1 overflow-auto overscroll-contain px-3 py-3"
        style={{ WebkitOverflowScrolling: "touch" }}
        data-testid="document-scroller"
      >
        {loading && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-white/70">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Chargement du document…</span>
          </div>
        )}
        {error && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white/80">
            <p className="text-sm">{error}</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/15 px-4 py-2 text-sm">
              Ouvrir dans un nouvel onglet
            </a>
          </div>
        )}
        <div ref={pagesHost} />
        {!loading && !error && (
          <p className="pb-2 pt-1 text-center text-xs text-white/40">
            {numPages > 1 ? `Fin du document — ${numPages} pages` : "Fin du document"}
          </p>
        )}
      </div>

      {/* Accusé de lecture, en pied de document */}
      <div className="shrink-0 border-t border-black/10 bg-white px-4 pb-[env(safe-area-inset-bottom)] pt-3">
        {!reachedEnd && !error ? (
          <p className="pb-3 text-center text-xs text-gray-500" data-testid="text-scroll-hint">
            Faites défiler jusqu&apos;à la fin du document pour pouvoir le valider.
          </p>
        ) : (
          <>
            <label className="mb-3 flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0"
                data-testid="checkbox-read-document"
              />
              <span>{acknowledgeLabel}</span>
            </label>
            <button
              type="button"
              onClick={onAcknowledge}
              disabled={!checked}
              className="mb-3 w-full rounded-xl bg-[#B89C6D] py-3.5 font-medium text-white disabled:opacity-40"
              data-testid="button-acknowledge-document"
            >
              Valider et passer à la signature
            </button>
          </>
        )}
      </div>
    </div>
  );
}
