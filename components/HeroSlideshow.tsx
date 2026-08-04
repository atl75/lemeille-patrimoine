"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

type Slide = { src: string; alt: string };

// Diaporama du hero : fondu enchaîné lent entre les visuels (Paris, Normandie,
// Côte d'Azur). La première image est chargée en priorité (LCP), les suivantes
// en différé. Purement décoratif — le contenu du hero reste au-dessus.
export default function HeroSlideshow({ images, interval = 6500 }: { images: Slide[]; interval?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => setIndex(p => (p + 1) % images.length), interval);
    return () => clearInterval(id);
  }, [images.length, interval]);

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {images.map((img, i) => (
        <Image
          key={img.src}
          src={img.src}
          alt={img.alt}
          fill
          priority={i === 0}
          loading={i === 0 ? "eager" : "lazy"}
          sizes="100vw"
          className={`object-cover object-center transition-opacity duration-[1500ms] ease-in-out ${i === index ? "opacity-100" : "opacity-0"}`}
        />
      ))}
    </div>
  );
}
