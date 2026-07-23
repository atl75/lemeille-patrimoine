import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Avis clients - Témoignages | Lemeille Patrimoine',
  description: 'Découvrez les avis et témoignages de nos clients sur nos services immobiliers et de gestion de patrimoine.',
  alternates: {
    canonical: '/avis'
  }
};

async function getReviews(){
  const base = process.env.NEXT_PUBLIC_SITE_URL || `http://127.0.0.1:${process.env.PORT||'3000'}`;
  const r = await fetch(`${base}/api/reviews`, { cache: 'no-store' });
  return r.ok ? r.json() : [];
}
export default async function Page(){
  const reviews = await getReviews();
  return (
    <main className="container py-12">
      <h1 className="luxe text-4xl mb-6">Avis clients</h1>
      <div className="grid gap-4">
        {reviews.map((rv:any)=>(
          <div key={rv.id} className="card p-6">
            <div className="font-semibold">{rv.author} — {rv.rating}★</div>
            <div className="text-sm opacity-70">{rv.source} · {rv.date}</div>
            <p className="mt-2">{rv.text}</p>
          </div>
        ))}
        {!reviews.length && <div className="opacity-70">Aucun avis pour le moment.</div>}
      </div>
    </main>
  );
}
