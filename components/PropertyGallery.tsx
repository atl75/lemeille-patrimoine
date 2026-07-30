"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Img from "./Img";

const Lightbox = dynamic(() => import("./Lightbox"), { ssr: false });

interface PropertyGalleryProps {
  images: string[];
  title: string;
}

export default function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

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
