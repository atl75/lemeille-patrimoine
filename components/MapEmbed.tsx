'use client';

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
  precision = 'EXACT',
  height = '280px',
  hl = 'fr'
}: MapEmbedProps) {
  if (!query) return null;
  
  const defaultZoom = zoom ?? (precision === 'EXACT' ? 18 : 15);
  const embedSrc = `https://www.google.com/maps?hl=${encodeURIComponent(hl)}&q=${encodeURIComponent(query)}&z=${encodeURIComponent(String(defaultZoom))}&output=embed`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  
  return (
    <div className="card p-0 overflow-hidden relative group">
      <iframe
        title={`Localisation — ${query}`}
        src={embedSrc}
        style={{ border: 0, width: '100%', height }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
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
