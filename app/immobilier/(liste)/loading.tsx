export default function Loading() {
  return (
    <main className="container py-14" aria-busy="true" aria-label="Chargement des biens">
      <div className="h-9 w-64 rounded bg-black/5 animate-pulse" />
      <div className="mt-3 h-px w-14 bg-gold/40" />
      <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="h-48 bg-black/5 animate-pulse" />
            <div className="p-5 space-y-3">
              <div className="h-5 w-3/4 rounded bg-black/5 animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-black/5 animate-pulse" />
              <div className="h-6 w-1/3 rounded bg-black/5 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
