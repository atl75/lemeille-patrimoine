import Link from "next/link";

export default async function DebugPage() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || `http://127.0.0.1:${process.env.PORT||'3000'}`;
  const res = await fetch(`${base}/api/properties`, { cache: 'no-store' });
  const data = await res.json();

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-6">🔍 Debug - Immobilier</h1>
      
      <div className="card p-6 mb-6">
        <h2 className="font-bold mb-2">API /api/properties</h2>
        <p>Status: {res.ok ? '✅ OK' : '❌ Erreur'}</p>
        <p>Nombre de biens retournés: <strong>{data.length}</strong></p>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-bold mb-4">Liste des biens</h2>
        {data.map((p: any, i: number) => (
          <div key={p.id} className="mb-4 p-4 border rounded">
            <p><strong>#{i + 1} - ID:</strong> {p.id}</p>
            <p><strong>Titre:</strong> {p.title}</p>
            <p><strong>Ville:</strong> {p.city}</p>
            <p><strong>Région:</strong> {p.region}</p>
            <p><strong>Prix:</strong> {p.price?.toLocaleString('fr-FR')} €</p>
            <p><strong>Surface:</strong> {p.surface} m²</p>
            <p><strong>Pièces:</strong> {p.rooms}</p>
            <p><strong>DPE:</strong> {p.dpe?.classEnergy}</p>
            <p><strong>Caractéristiques:</strong> {p.features?.join(', ') || 'Aucune'}</p>
            <p><strong>Visible:</strong> {p.visible === undefined ? 'undefined' : String(p.visible)}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="font-bold mb-2">Variables d&apos;environnement</h2>
        <p>NEXT_PUBLIC_SITE_URL: {process.env.NEXT_PUBLIC_SITE_URL || "non défini (utilise localhost)"}</p>
        <p>PORT: {process.env.PORT || "3000"}</p>
        <p>Base URL utilisée: {base}</p>
      </div>

      <div className="mt-6">
        <Link href="/immobilier" className="btn btn-gold">← Retour à la page immobilier</Link>
      </div>
    </main>
  );
}
