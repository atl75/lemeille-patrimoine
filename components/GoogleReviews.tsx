"use client";

import { useQuery } from "@tanstack/react-query";
import Stars from "./Stars";
import Img from "./Img";

async function fetchReviews() {
  try {
    const r = await fetch("/api/reviews/google", { cache: "no-store" });
    if (!r.ok) throw new Error("fetch error");
    return r.json();
  } catch {
    return { reviews: [] };
  }
}

export default function GoogleReviews() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/reviews/google"],
    queryFn: fetchReviews,
  });

  const rating = data?.rating;
  const total = data?.total;
  const reviews = data?.reviews || [];

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 64 64" role="img" aria-label="Lemeille Patrimoine">
            <circle cx="32" cy="32" r="26" fill="none" stroke="#B89C6D" strokeWidth="2"/>
            <text x="32" y="39" style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }} fontSize="22" textAnchor="middle" fill="#B89C6D">LP</text>
          </svg>
          <div>
            <div className="luxe text-xl">Avis Google</div>
            <div className="text-sm opacity-70">Chargement...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 64 64" role="img" aria-label="Lemeille Patrimoine">
            <circle cx="32" cy="32" r="26" fill="none" stroke="#B89C6D" strokeWidth="2"/>
            <text x="32" y="39" style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }} fontSize="22" textAnchor="middle" fill="#B89C6D">LP</text>
          </svg>
          <div>
            <div className="luxe text-xl">Avis Google</div>
            <div className="text-sm opacity-70">{rating ? `${rating}/5 • ${total} avis` : `${reviews.length} avis`}</div>
          </div>
        </div>
        {rating && <Stars value={Number(rating)} />}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {reviews.slice(0, 6).map((rv: any, i: number) => (
          <div key={i} className="rounded-2xl border p-4 bg-white">
            <div className="flex items-center justify-between">
              <div className="font-medium">{rv.author || "Client Google"}</div>
              <Stars value={rv.rating} />
            </div>
            {rv.time && <div className="text-xs opacity-75 mt-0.5">{rv.time}</div>}
            <p className="mt-2">{rv.text}</p>
          </div>
        ))}
        {!reviews.length && <div className="opacity-70 text-sm">Pas encore d&apos;avis disponibles ici. Vous pouvez en laisser un sur notre fiche Google.</div>}
      </div>

      <a href="https://www.google.com/search?q=Lemeille+Patrimoine" target="_blank" rel="noopener noreferrer" className="btn btn-gold mt-4 inline-block" data-testid="link-google-reviews">
        Lire tous les avis
      </a>
    </div>
  );
}
