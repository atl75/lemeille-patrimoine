"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

// Contenu tiers lourd inséré seulement quand il est utile.
//
// mode="click"    : rien n'est chargé tant que l'utilisateur ne le demande pas.
//                   Réservé aux intégrations très lourdes — la visite 3D de
//                   threed.fr télécharge à elle seule 11,4 Mo d'images.
// mode="viewport" : chargé à l'approche de l'écran. loading="lazy" ne suffit
//                   pas, les navigateurs le déclenchent très en amont.
type Props = {
  src: string;
  title: string;
  mode?: "click" | "viewport";
  poster?: string;
  label?: string;
  hint?: string;
  className?: string;
  allowFullScreen?: boolean;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
};

export default function DeferredIframe({
  src,
  title,
  mode = "viewport",
  poster,
  label = "Lancer",
  hint,
  className = "w-full h-full",
  allowFullScreen,
  referrerPolicy,
}: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (mode !== "viewport" || show) return;

    // Repli géométrique : l'IntersectionObserver ne se déclenche pas dans un
    // document masqué (onglet en arrière-plan, certaines webviews). Un simple
    // calcul de position, lui, fonctionne toujours — sans quoi le contenu
    // pourrait ne jamais apparaître.
    const near = () => {
      const el = holder.current;
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.top < (window.innerHeight || 0) + 200 && r.bottom > -200;
    };
    if (near()) { setShow(true); return; }

    const onScroll = () => { if (near()) { setShow(true); cleanup(); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined" && holder.current) {
      io = new IntersectionObserver(
        (e) => { if (e.some((x) => x.isIntersecting)) { setShow(true); cleanup(); } },
        { rootMargin: "200px" }
      );
      io.observe(holder.current);
    }
    function cleanup() {
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    }
    return cleanup;
  }, [mode, show]);

  if (show) {
    return (
      <iframe
        src={src}
        title={title}
        className={className}
        allowFullScreen={allowFullScreen}
        referrerPolicy={referrerPolicy}
        allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope"
      />
    );
  }

  if (mode === "viewport") {
    return <div ref={holder} className={`${className} bg-[#EEF1EC]`} aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={() => setShow(true)}
      className={`group relative ${className} block cursor-pointer bg-[#12241b]`}
      aria-label={`${label} — ${title}`}
      data-testid="button-load-embed"
    >
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-70" />
      )}
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform group-hover:scale-105">
          <Play size={26} fill="#1F3B2C" color="#1F3B2C" />
        </span>
        <span className="text-sm font-semibold text-white drop-shadow">{label}</span>
        {hint && <span className="text-xs text-white/75 drop-shadow">{hint}</span>}
      </span>
    </button>
  );
}
