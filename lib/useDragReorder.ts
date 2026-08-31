"use client";

import { useCallback, useRef, useState } from "react";

// Réordonnancement par glisser-déposer, souris et tactile confondus.
//
// On utilise les événements pointeur plutôt que l'API drag-and-drop HTML5 :
// cette dernière ne fonctionne pas sur écran tactile, or les photos sont
// souvent reprises depuis un iPad. La cible est déterminée par la position du
// pointeur (elementFromPoint) plutôt que par des événements de survol, ce qui
// évite d'avoir à poser des gestionnaires sur chaque voisin.
export function useDragReorder(onReorder: (de: number, vers: number) => void) {
  const [depuis, setDepuis] = useState<number | null>(null);
  const [survole, setSurvole] = useState<number | null>(null);
  const actif = useRef(false);

  const cibleSous = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y);
    const hote = el?.closest?.("[data-reorder-index]") as HTMLElement | null;
    if (!hote) return null;
    const n = Number(hote.getAttribute("data-reorder-index"));
    return Number.isFinite(n) ? n : null;
  };

  const poignee = useCallback((index: number) => ({
    // touch-action: none — sans quoi le navigateur interprète le geste comme un
    // défilement et le glissement ne démarre jamais sur mobile.
    style: { touchAction: "none" as const, cursor: "grab" },
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      actif.current = true;
      setDepuis(index);
      setSurvole(index);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!actif.current) return;
      const c = cibleSous(e.clientX, e.clientY);
      if (c !== null) setSurvole(c);
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (!actif.current) return;
      actif.current = false;
      const c = cibleSous(e.clientX, e.clientY);
      if (depuis !== null && c !== null && c !== depuis) onReorder(depuis, c);
      setDepuis(null);
      setSurvole(null);
    },
    onPointerCancel: () => { actif.current = false; setDepuis(null); setSurvole(null); },
  }), [depuis, onReorder]);

  // À poser sur chaque élément déplaçable, pour que le pointeur le retrouve.
  const zone = useCallback((index: number) => ({
    "data-reorder-index": index,
    className: depuis === index ? "opacity-40" : survole === index && depuis !== null ? "ring-2 ring-[#B89C6D]" : "",
  }), [depuis, survole]);

  return { poignee, zone, depuis, survole };
}
