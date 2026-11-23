'use client';

import { useState } from 'react';

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
  // Aucune connexion à Google Maps avant le clic explicite du visiteur.
  const [visible, setVisible] = useState(false);

  if (!query) return null;

  // Confidentialité : sur les fiches biens on affiche une ZONE approximative,
  // pas l'adresse exacte. Zoom volontairement large et cercle de secteur en
  // surimpression pour matérialiser un quartier plutôt qu'un point précis.
  const isArea = precision !== 'EXACT';
  const defaultZoom = zoom ?? (isArea ? 14 : 16);
  const embedSrc = `https://www.google.com/maps?hl=${encodeURIComponent(hl)}&q=${encodeURIComponent(query)}&z=${encodeURIComponent(String(defaultZoom))}&output=embed`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <div className="card p-0 overflow-hidden relative group">
      <div className="relative">
      {visible ? (
        <iframe
          title={`Secteur — ${query}`}
          src={embedSrc}
          style={{ border: 0, width: '100%', height }}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div style={{ width: '100%', minHeight: height }} className="bg-[#EEF1EC] flex flex-col items-center justify-center p-6 text-center gap-3">
          <p className="font-medium text-luxe">{isArea ? 'Secteur approximatif' : 'Localisation'} — {query}</p>
          <p className="text-sm max-w-md">Afficher cette carte autorise une connexion à Google Maps, qui peut utiliser des cookies et traiter des données de navigation. <a href="https://policies.google.com/privacy?hl=fr" className="underline" target="_blank" rel="noopener noreferrer">Confidentialité Google</a></p>
          <button type="button" className="btn min-h-11" onClick={() => setVisible(true)}>Afficher la carte Google Maps</button>
        </div>
      )}

      {visible && isArea && (
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

      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-white text-sm">
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center min-h-11 underline underline-offset-2"
        data-testid="link-open-google-maps"
      >
        Ouvrir Google Maps dans un nouvel onglet
      </a>
      {visible && <button type="button" className="min-h-11 underline" onClick={() => setVisible(false)}>Masquer la carte</button>}
      </div>
    </div>
  );
}
