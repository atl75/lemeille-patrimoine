"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cldImg } from "@/lib/cldImg";
import { largeurVisionneuse, LARGEUR_APERCU } from "@/lib/largeurVisionneuse";
import { useModalA11y } from '@/lib/useModalA11y';
import { adjacentPhotos, galleryIndex } from '@/lib/gallery';

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
  const dialogRef = useModalA11y<HTMLDialogElement>(onClose, images.length > 0);
  const instructionsId = useId();
  const index = galleryIndex(currentIndex, images.length);
  const hasImages = images.length > 0;

  useEffect(() => {
    if (!hasImages) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [hasImages]);

  // Largeur unique pour tout le lecteur, fixée une fois selon l'écran. Le
  // calcul vit dans lib/largeurVisionneuse : la galerie s'en sert pour
  // précharger au survol, à cette largeur exactement.
  const largeur = useMemo(() => largeurVisionneuse(), []);

  const urlDe = useCallback((i: number) => cldImg(images[i], largeur), [images, largeur]);
  // L'aperçu est la vignette DÉJÀ chargée par la galerie : il sort du cache du
  // navigateur et s'affiche sans délai, là où la pleine définition faisait
  // patienter devant un écran vide.
  const apercuDe = useCallback((i: number) => cldImg(images[i], LARGEUR_APERCU), [images]);

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Précharge les voisines à la MÊME largeur que l'affichage. Deux de chaque
  // côté : on parcourt une galerie dans les deux sens.
  useEffect(() => {
    const voisines = adjacentPhotos(index, images.length);
    for (const i of voisines) {
      if (!images[i]) continue;
      const im = new window.Image();
      im.decoding = "async";
      im.src = urlDe(i);
    }
  }, [index, images, urlDe]);

  useEffect(() => {
    setChargement(true);
    setErreur(false);
    // Une image DÉJÀ EN CACHE est complète avant que React n'attache onLoad :
    // l'événement ne tire jamais, et la pleine définition restait invisible
    // sous l'aperçu flou — indéfiniment. Constaté le 8 septembre en admin, sur
    // une photo rouverte. On interroge donc l'élément plutôt que d'attendre un
    // événement qui ne viendra pas.
    const el = imgRef.current;
    if (el?.complete) { setChargement(false); setErreur(el.naturalWidth === 0); }
  }, [index]);

  if (!images.length) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-label={title ? `Photos — ${title}` : "Galerie d'images"}
      aria-describedby={instructionsId}
      className="lightbox-dialog fixed inset-0 m-0 h-[100dvh] w-screen max-h-none max-w-none border-0 p-0 bg-white text-[#1F3B2C]"
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onKeyDown={event => {
        if (images.length < 2) return;
        if (event.key === 'ArrowRight') { event.preventDefault(); onNext(); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); onPrev(); }
      }}
      data-testid="lightbox-overlay"
    >
      <p id={instructionsId} className="sr-only">Utilisez les flèches gauche et droite pour parcourir les photos, et Échap pour fermer.</p>
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute z-20 top-3 right-3 text-[#1F3B2C] hover:bg-stone-100 bg-white border border-stone-200 shadow-sm min-h-11 min-w-11 p-2 rounded-md"
        aria-label="Fermer"
        data-testid="button-close-lightbox"
      >
        <X size={32} />
      </button>

      {/* Previous button */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute z-10 left-1 sm:left-4 text-[#1F3B2C] hover:bg-stone-100 bg-white border border-stone-200 shadow-sm min-h-11 min-w-11 p-2 rounded-md"
          aria-label="Image précédente"
          data-testid="button-prev-image"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {/* Image */}
      {/* Le cadre a une taille FIXE, dictée par la fenêtre, et les deux images
          s'y inscrivent en object-contain : elles se superposent donc au pixel
          près, quelles que soient leurs définitions respectives. Sans cette
          taille fixe, c'est l'aperçu — large de 384 px — qui dimensionnait le
          bloc, et la photo « agrandie » s'affichait en tout petit.
          La fermeture sur le fond est limitée aux marges extérieures du
          dialogue ; les photos et le compteur ne le ferment pas. */}
      <div className="relative h-[85vh] w-[90vw] flex items-center justify-center">
        {/* L'aperçu donne sa taille au bloc et s'affiche immédiatement ; la
            pleine définition se pose exactement dessus et apparaît en fondu
            quand elle arrive. On voit donc la photo tout de suite, floue une
            fraction de seconde, plutôt qu'un cadre vide. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={`apercu-${index}`}
          src={apercuDe(index)}
          alt=""
          aria-hidden
          decoding="async"
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 h-full w-full rounded-lg object-contain blur-[6px]"
        />
        {chargement && (
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-[#1F3B2C]" />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={`plein-${index}`}
          ref={imgRef}
          src={urlDe(index)}
          alt={title ? `${title} - Image ${index + 1}` : `Image ${index + 1}`}
          decoding="async"
          onLoad={() => setChargement(false)}
          onError={() => { setChargement(false); setErreur(true); }}
          onClick={(e) => e.stopPropagation()}
          className={`absolute inset-0 h-full w-full rounded-lg object-contain transition-opacity duration-200 motion-reduce:transition-none ${chargement || erreur ? "opacity-0" : "opacity-100"}`}
          data-testid={`lightbox-image-${index}`}
        />

        
        {/* Counter */}
        <div role="status" aria-live="polite" aria-atomic="true" className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-[#1F3B2C] border border-stone-200 shadow-sm px-4 py-2 rounded text-sm text-center">
          <span className="sr-only">Photo </span>{index + 1} / {images.length}
          {erreur && <p className="mt-1">Cette photo n’a pas pu être chargée. Essayez une autre photo.</p>}
        </div>
      </div>

      {/* Next button */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute z-10 right-1 sm:right-4 text-[#1F3B2C] hover:bg-stone-100 bg-white border border-stone-200 shadow-sm min-h-11 min-w-11 p-2 rounded-md"
          aria-label="Image suivante"
          data-testid="button-next-image"
        >
          <ChevronRight size={28} />
        </button>
      )}
    </dialog>
  );
}
