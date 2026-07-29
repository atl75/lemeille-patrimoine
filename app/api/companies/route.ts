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

    // Libellés de forme juridique (codes INSEE fréquents)
    const FORMS: Record<string, string> = {
      '5710': 'SAS', '5720': 'SASU', '5499': 'SA', '5498': 'SA',
      '5307': 'SNC', '5202': 'SNC',
      '5410': 'SARL', '5415': 'SARL', '5426': 'EURL',
      '6540': 'SCI', '6560': 'SC', '6599': 'SC',
      '1000': 'Entrepreneur individuel',
    };

    // Sélectionne le représentant légal : une personne physique dont la
    // qualité correspond à un mandataire social (hors commissaire aux comptes).
    const pickManager = (dirigeants: any[]) => {
      const list = Array.isArray(dirigeants) ? dirigeants : [];
      const isRep = (q: string) => /président|president|gérant|gerant|directeur général|directeur general|associé|associe/i.test(q) && !/commissaire/i.test(q);
      return (
        list.find((d) => d?.type_dirigeant === 'personne physique' && isRep(d?.qualite || '')) ||
        list.find((d) => d?.type_dirigeant === 'personne physique' && !/commissaire/i.test(d?.qualite || '')) ||
        null
      );
    };

    // Formater les résultats
    const results = (data.results || []).map((company: any) => {
      const dir = pickManager(company.dirigeants);
      const managerLastName = dir?.nom || '';
      const managerFirstName = dir?.prenoms || dir?.prenom || '';
      const managerRole = dir?.qualite || '';
      const legalForm = FORMS[company.nature_juridique] || company.nature_juridique || '';
      return {
        siren: company.siren,
        name: company.nom_complet || company.nom_raison_sociale,
        legalForm,
        managerFirstName,
        managerLastName,
        managerRole,
        address: [
          company.siege?.numero_voie,
          company.siege?.type_voie,
          company.siege?.libelle_voie,
          company.siege?.code_postal,
          company.siege?.libelle_commune
        ].filter(Boolean).join(' '),
        activity: company.activite_principale,
        isActive: company.etat_administratif === 'A'
      };
    });

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
