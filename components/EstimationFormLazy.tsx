"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Charge le formulaire d'estimation UNIQUEMENT quand la section approche du
// viewport (le chunk JS n'est pas téléchargé au chargement de la page d'accueil).
const EstimationForm = dynamic(() => import("@/components/EstimationForm"), {
  ssr: false,
  loading: () => <div className="card p-6 text-center opacity-75">Chargement du formulaire d’estimation…</div>,
});

export default function EstimationFormLazy() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show || !ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px" }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [show]);

  return (
    <div ref={ref}>
      {show ? (
        <EstimationForm />
      ) : (
        <div className="card p-6 text-center opacity-75">Estimation gratuite — le formulaire se charge en approchant…</div>
      )}
    </div>
  );
}
