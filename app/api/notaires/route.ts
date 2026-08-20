import { NextResponse } from 'next/server';

// Recherche d'études notariales via le registre officiel des entreprises
// (recherche-entreprises.api.gouv.fr), filtrée sur l'activité juridique 69.10Z
// puis restreinte aux notaires (on écarte avocats / huissiers / etc.) pour ne
// pas polluer la recherche. Il n'existe pas d'API publique dédiée aux notaires.
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  try {
    // La recherche porte sur le NOM d'entreprise : on ajoute « notaire » (sauf
    // s'il y est déjà) pour faire remonter les études, y compris sur une requête
    // de type ville. Puis filtre strict sur les noms notariaux.
    const qBiased = /notai/i.test(q) ? q : `${q} notaire`;
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(qBiased)}&activite_principale=69.10Z&per_page=20`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();

    const results = (data.results || [])
      .map((c: any) => ({
        name: c.nom_complet || c.nom_raison_sociale || '',
        siren: c.siren,
        city: c.siege?.libelle_commune || '',
        address: [
          c.siege?.numero_voie,
          c.siege?.type_voie,
          c.siege?.libelle_voie,
          c.siege?.code_postal,
          c.siege?.libelle_commune,
        ].filter(Boolean).join(' '),
      }))
      .filter((c: any) => {
        const n = (c.name || '').toLowerCase();
        if (!n || !/notair|notari/.test(n)) return false;           // uniquement les études notariales
        // Écarte les organismes institutionnels (pas des études).
        return !/chambre|conseil r[ée]gional|conseil d[ée]partemental|conseil sup[ée]rieur|centre de m[ée]diation|m[ée]diation/.test(n);
      })
      .slice(0, 8);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
