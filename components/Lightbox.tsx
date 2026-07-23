"use client";

import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Img from "./Img";

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Galerie d'images"
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
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
        <Img
          src={images[currentIndex]}
          alt={title ? `${title} - Image ${currentIndex + 1}` : `Image ${currentIndex + 1}`}
          width={1920}
          height={1080}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
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
