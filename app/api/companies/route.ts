import { NextRequest, NextResponse } from "next/server";

// API pour rechercher des entreprises via l'API Recherche d'Entreprises (data.gouv.fr)
// Documentation: https://recherche-entreprises.api.gouv.fr/docs/
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Rechercher via l'API officielle gratuite
    const response = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&per_page=10`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error("Erreur lors de la recherche d'entreprises");
    }

    const data = await response.json();

    // Formater les résultats
    const results = (data.results || []).map((company: any) => ({
      siren: company.siren,
      name: company.nom_complet || company.nom_raison_sociale,
      address: [
        company.siege?.numero_voie,
        company.siege?.type_voie,
        company.siege?.libelle_voie,
        company.siege?.code_postal,
        company.siege?.libelle_commune
      ].filter(Boolean).join(' '),
      activity: company.activite_principale,
      isActive: company.etat_administratif === 'A'
    }));

    return NextResponse.json({ results });

  } catch (error: any) {
    console.error("Erreur recherche entreprise:", error);
    return NextResponse.json(
      { 
        error: "Erreur lors de la recherche d'entreprises",
        details: error.message 
      },
      { status: 500 }
    );
  }
}
