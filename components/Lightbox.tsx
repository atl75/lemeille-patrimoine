"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cldImg } from "@/lib/cldImg";

interface LightboxProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  title?: string;
}

export default function Lightbox({
  images,
  currentIndex,
  onClose,
  onNext,
  onPrev,
  title,
}: LightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    },
    [onClose, onNext, onPrev]
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Largeur unique pour tout le lecteur, fixée une fois selon l'écran. Sans
  // cela, next/image laissait le navigateur choisir dans un jeu de largeurs
  // (1200, 1600, 2400…) tandis que le préchargement en visait une seule : les
  // URLs ne coïncidaient jamais et rien n'était réellement mis en cache.
  const largeur = useMemo(() => {
    if (typeof window === "undefined") return 1600;
    const px = Math.round(window.innerWidth * 0.92 * Math.min(window.devicePixelRatio || 1, 2));
    return px <= 900 ? 828 : px <= 1400 ? 1200 : px <= 1900 ? 1600 : 2400;
  }, []);

  const urlDe = useCallback((i: number) => cldImg(images[i], largeur), [images, largeur]);

  const [chargement, setChargement] = useState(true);

  // Précharge les voisines à la MÊME largeur que l'affichage. Deux de chaque
  // côté : on parcourt une galerie dans les deux sens.
  useEffect(() => {
    const voisines = [1, -1, 2, -2]
      .map((d) => (currentIndex + d + images.length) % images.length)
      .filter((i, k, arr) => arr.indexOf(i) === k && i !== currentIndex);
    for (const i of voisines) {
      if (!images[i]) continue;
      const im = new window.Image();
      im.decoding = "async";
      im.src = urlDe(i);
    }
  }, [currentIndex, images, urlDe]);

  // Une image déjà en cache s'affiche sans transition : on ne montre
  // l'indicateur que si le chargement dure réellement.
  useEffect(() => { setChargement(true); }, [currentIndex]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Galerie d'images"
      className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
      onClick={onClose}
      data-testid="lightbox-overlay"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-[#B89C6D] transition-colors p-2 hover-elevate active-elevate-2 rounded-md"
        aria-label="Fermer"
        data-testid="button-close-lightbox"
      >
        <X size={32} />
      </button>

      {/* Previous button */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-4 text-white hover:text-[#B89C6D] transition-colors p-2 hover-elevate active-elevate-2 rounded-md"
          aria-label="Image précédente"
          data-testid="button-prev-image"
        >
          <ChevronLeft size={48} />
        </button>
      )}

      {/* Image */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {chargement && (
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white/90" />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urlDe(currentIndex)}
          alt={title ? `${title} - Image ${currentIndex + 1}` : `Image ${currentIndex + 1}`}
          decoding="async"
          onLoad={() => setChargement(false)}
          onError={() => setChargement(false)}
          className={`max-h-[85vh] max-w-full rounded-lg object-contain transition-opacity duration-150 ${chargement ? "opacity-0" : "opacity-100"}`}
          data-testid={`lightbox-image-${currentIndex}`}
        />

        
        {/* Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {/* Next button */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 text-white hover:text-[#B89C6D] transition-colors p-2 hover-elevate active-elevate-2 rounded-md"
          aria-label="Image suivante"
          data-testid="button-next-image"
        >
          <ChevronRight size={48} />
        </button>
      )}
    </div>
  );
}
