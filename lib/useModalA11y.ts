"use client";
import { useEffect, useRef } from "react";
import { activateModal } from './modalA11y';

/**
 * Fermeture au clavier (Échap) + piège à focus basique pour les
 * modales/panneaux flottants. `active` permet de ne brancher les
 * écouteurs que lorsque l'élément est réellement affiché.
 */
export function useModalA11y<T extends HTMLElement>(onClose: () => void, active: boolean) {
  const containerRef = useRef<T>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    return activateModal(container, () => closeRef.current());
  }, [active]);

  return containerRef;
}
