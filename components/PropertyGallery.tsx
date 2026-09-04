"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Img from "./Img";
import { cldImg } from "@/lib/cldImg";
import { largeurVisionneuse } from "@/lib/largeurVisionneuse";

const Lightbox = dynamic(() => import("./Lightbox"), { ssr: false });

interface PropertyGalleryProps {
  images: string[];
  title: string;
}

export default function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Précharge la photo en grand dès le survol, à la largeur EXACTE que la
  // visionneuse demandera. Le clic suit le survol de quelques centaines de
  // millisecondes : autant les employer à télécharger, plutôt que de faire
  // attendre devant un écran noir. Sur mobile, le toucher déclenche la même
  // chose avant que le doigt ne se relève.
  const dejaDemandees = useRef<Set<string>>(new Set());
  const precharger = useCallback((src: string) => {
    if (!src) return;
    const url = cldImg(src, largeurVisionneuse());
    if (dejaDemandees.current.has(url)) return;
    dejaDemandees.current.add(url);
    const im = new window.Image();
    im.decoding = "async";
    im.src = url;
  }, []);

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <>
      {/* Main image */}
      <div className="card p-0 overflow-hidden">
        <Img
          src={images[0]}
          alt={title}
          width={1280}
          height={720}
          sizes="(max-width: 768px) 100vw, 640px"
          priority
          className="w-full h-[420px] object-cover cursor-pointer hover:opacity-90 transition"
          onClick={() => openLightbox(0)}
          onMouseEnter={() => precharger(images[0])}
          onTouchStart={() => precharger(images[0])}
          data-testid="image-main"
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.slice(1).map((src: string, i: number) => (
            <Img
              key={i}
              src={src}
              alt={`${title} ${i + 2}`}
              width={260}
              height={260}
              sizes="(max-width: 768px) 20vw, 130px"
              className="w-full h-24 object-cover rounded-2xl border cursor-pointer hover:opacity-80 transition"
              onClick={() => openLightbox(i + 1)}
              onMouseEnter={() => precharger(src)}
              onTouchStart={() => precharger(src)}
              data-testid={`image-thumbnail-${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          images={images}
          currentIndex={currentIndex}
          onClose={() => setLightboxOpen(false)}
          onNext={handleNext}
          onPrev={handlePrev}
          title={title}
        />
      )}
    </>
  );
}
