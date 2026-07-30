'use client';
import { useState, useEffect, useCallback } from 'react';
import Img from '@/components/Img';
type Props = { images: string[]; alt?: string };
export default function Gallery({ images, alt = 'Photo du bien' }: Props) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const openAt = (i: number) => { setIdx(i); setOpen(true); };
  const close = () => setOpen(false);
  const prev = useCallback(() => setIdx((i)=> (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIdx((i)=> (i + 1) % images.length), [images.length]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') prev(); if (e.key === 'ArrowRight') next(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, prev, next]);
  if (!images?.length) return null;
  const cover = images[0];
  return (
    <div>
      <button className="block w-full card p-0 overflow-hidden" onClick={()=>openAt(0)} aria-label="Agrandir l'image">
        <Img src={cover} alt={alt} className="w-full h-[420px] object-cover" height={420} />
      </button>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.slice(1).map((src, i) => (
            <button key={i} onClick={()=>openAt(i+1)} className="block">
              <Img src={src} alt={`${alt} ${i+2}`} className="w-full h-24 object-cover rounded-2xl border border-black/10" height={96} />
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4" onClick={close} role="dialog" aria-modal="true">
          <button className="absolute top-4 right-4 text-white/90 text-xl" onClick={close} aria-label="Fermer">✕</button>
          <button className="absolute left-3 md:left-6 text-white/90 text-2xl" onClick={(e)=>{ e.stopPropagation(); prev(); }} aria-label="Précédent">‹</button>
          <Img src={images[idx]} alt={`${alt} ${idx+1}`} className="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl rounded-2xl" onClick={(e)=> e.stopPropagation()} />
          <button className="absolute right-3 md:right-6 text-white/90 text-2xl" onClick={(e)=>{ e.stopPropagation(); next(); }} aria-label="Suivant">›</button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-xs">{idx+1} / {images.length}</div>
        </div>
      )}
    </div>
  );
}
