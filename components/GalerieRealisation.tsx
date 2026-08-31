"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { cldImg } from "@/lib/cldImg";
import { Maximize2 } from "lucide-react";

const Lightbox = dynamic(() => import("./Lightbox"), { ssr: false });

export type PhotoRealisation = { image?: string; legende?: string; categorie?: string };

const CATEGORIES = [
  { code: "EXTERIEUR", label: "Extérieur" },
  { code: "COMMUNES", label: "Parties communes" },
  { code: "PRIVATIVES", label: "Parties privatives" },
] as const;

// Galerie d'une réalisation, groupée par partie et consultable en plein écran.
//
// Le lecteur parcourt l'ENSEMBLE des photos, pas seulement la partie ouverte :
// une fois en plein écran on veut pouvoir tout faire défiler sans revenir en
// arrière. L'ordre suit celui de l'affichage, de l'extérieur vers l'intérieur.
export default function GalerieRealisation({ photos, titre }: { photos: PhotoRealisation[]; titre: string }) {
  const [index, setIndex] = useState<number | null>(null);

  const groupes = CATEGORIES.map(c => ({
    ...c,
    items: (photos || []).filter(p => p?.image && (p.categorie || "EXTERIEUR") === c.code),
  })).filter(g => g.items.length > 0);

  // Suite à plat, dans l'ordre affiché, pour la navigation du lecteur.
  const toutes = groupes.flatMap(g => g.items);
  if (!toutes.length) return null;
  const sources = toutes.map(p => p.image as string);

  let curseur = 0;

  return (
    <>
      {groupes.map(g => (
        <div key={g.code} className="mt-10 first:mt-8">
          <h3 className="eyebrow">{g.label}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((p) => {
              const i = curseur++;
              return (
                <figure key={i} className="m-0">
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Agrandir : ${p.legende || `${g.label} ${i + 1}`}`}
                    className="group relative block w-full cursor-zoom-in overflow-hidden rounded-xl border"
                    data-testid={`button-galerie-${i}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cldImg(p.image as string, 1200)}
                      alt={p.legende || `${g.label} — ${titre}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      style={{ aspectRatio: "3 / 2" }}
                    />
                    <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <Maximize2 className="h-3.5 w-3.5" /> Agrandir
                    </span>
                  </button>
                  {p.legende && <figcaption className="mt-2 text-sm text-luxe/70">{p.legende}</figcaption>}
                </figure>
              );
            })}
          </div>
        </div>
      ))}

      {index !== null && (
        <Lightbox
          images={sources}
          currentIndex={index}
          title={toutes[index]?.legende || titre}
          onClose={() => setIndex(null)}
          onNext={() => setIndex(i => (i === null ? i : (i + 1) % sources.length))}
          onPrev={() => setIndex(i => (i === null ? i : (i - 1 + sources.length) % sources.length))}
        />
      )}
    </>
  );
}
