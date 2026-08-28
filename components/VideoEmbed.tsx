'use client';

import { useState } from 'react';

// Façade vidéo : tant que l'utilisateur n'a pas cliqué, on n'affiche qu'une
// miniature. L'iframe (et le ~1 Mo de JavaScript YouTube, plus ses cookies
// tiers) n'est chargée qu'à la demande. Le domaine youtube-nocookie évite en
// outre le dépôt de cookies publicitaires.
export default function VideoEmbed({
  provider,
  id,
  title,
}: {
  provider: 'youtube' | 'vimeo';
  id: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);

  const src =
    provider === 'youtube'
      ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
      : `https://player.vimeo.com/video/${id}?autoplay=1`;

  const poster =
    provider === 'youtube' ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;

  return (
    <div className="relative w-full pt-[56.25%] rounded-xl overflow-hidden bg-[#12241b]">
      {playing ? (
        <iframe
          src={src}
          title={title}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Lire la vidéo — ${title}`}
          className="group absolute inset-0 w-full h-full cursor-pointer"
          data-testid="button-play-video"
        >
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt=""
              width={480}
              height={360}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <span className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex items-center justify-center h-16 w-16 rounded-full bg-white/95 shadow-lg transition-transform group-hover:scale-105">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="#1F3B2C" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
