'use client';

import { useEffect, useRef, useState } from 'react';

type MapEmbedProps = {
  query: string;
  zoom?: number;
  precision?: 'EXACT' | 'AREA';
  height?: string;
  hl?: string;
};

export default function MapEmbed({
  query,
  zoom,
  precision = 'AREA',
  height = '280px',
  hl = 'fr'
}: MapEmbedProps) {
  // Google Maps représente ~400 Ko de JavaScript tiers. L'attribut loading="lazy"
  // ne suffit pas : les navigateurs le déclenchent très en amont. On n'insère
  // l'iframe qu'à l'approche réelle du viewport, à hauteur réservée (aucun
  // décalage de mise en page).
  const holder = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible || !holder.current) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); } },
      { rootMargin: '200px' }
    );
    io.observe(holder.current);
    return () => io.disconnect();
  }, [visible]);

  if (!query) return null;

  // Confidentialité : sur les fiches biens on affiche une ZONE approximative,
  // pas l'adresse exacte. Zoom volontairement large et cercle de secteur en
  // surimpression pour matérialiser un quartier plutôt qu'un point précis.
  const isArea = precision !== 'EXACT';
  const defaultZoom = zoom ?? (isArea ? 14 : 16);
  const embedSrc = `https://www.google.com/maps?hl=${encodeURIComponent(hl)}&q=${encodeURIComponent(query)}&z=${encodeURIComponent(String(defaultZoom))}&output=embed`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <div ref={holder} className="card p-0 overflow-hidden relative group">
      {visible ? (
        <iframe
          title={`Secteur — ${query}`}
          src={embedSrc}
          style={{ border: 0, width: '100%', height }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div style={{ width: '100%', height }} className="bg-[#EEF1EC]" aria-hidden />
      )}

      {isArea && (
        <>
          {/* Cercle de secteur : matérialise une zone, masque le point exact */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className="rounded-full border-2"
              style={{
                width: '55%',
                aspectRatio: '1 / 1',
                backgroundColor: 'rgba(31, 59, 44, 0.14)',
                borderColor: 'rgba(138, 109, 63, 0.85)',
              }}
            />
          </div>
          <div className="pointer-events-none absolute bottom-2 left-2 bg-white/90 text-xs px-2 py-1 rounded-lg shadow">
            Secteur approximatif
          </div>
        </>
      )}

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors"
        data-testid="link-open-google-maps"
      >
        <span className="opacity-0 group-hover:opacity-100 bg-white px-4 py-2 rounded-2xl shadow-lg text-sm font-medium transition-opacity">
          Ouvrir dans Google Maps
        </span>
      </a>
    </div>
  );
}
