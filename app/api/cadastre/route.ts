import { NextRequest, NextResponse } from "next/server";
import * as turf from '@turf/turf';

// API pour rechercher les parcelles cadastrales à partir d'une adresse
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: "Adresse manquante" },
        { status: 400 }
      );
    }

    // Étape 1: Géocoder l'adresse pour obtenir les coordonnées et le code INSEE
    const geocodeResponse = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`
    );
    
    if (!geocodeResponse.ok) {
      throw new Error("Erreur lors du géocodage de l'adresse");
    }

    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData.features || geocodeData.features.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Adresse non trouvée"
      });
    }

    const feature = geocodeData.features[0];
    const coordinates = feature.geometry.coordinates; // [lon, lat]
    const cityCode = feature.properties.citycode;

    // Étape 2: Rechercher la parcelle cadastrale contenant ce point exact
    // L'API IGN permet de filtrer directement par point géographique
    const lon = coordinates[0];
    const lat = coordinates[1];
    
    const cadastreResponse = await fetch(
      `https://apicarto.ign.fr/api/cadastre/parcelle?geom=${encodeURIComponent(`{"type":"Point","coordinates":[${lon},${lat}]}`)}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!cadastreResponse.ok) {
      throw new Error("Erreur lors de la récupération des données cadastrales");
    }

    const cadastreData = await cadastreResponse.json();

    // Étape 3: Vérifier qu'une parcelle a été trouvée
    if (!cadastreData.features || cadastreData.features.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Aucune parcelle cadastrale trouvée pour cette adresse précise"
      });
    }

    // Prendre la première parcelle (celle qui contient le point)
    const parcel = cadastreData.features[0];
    const props = parcel.properties;

    // Formater la référence cadastrale
    const cadastralReference = `${props.section} ${props.numero}`;

    // Calculer la surface à partir de la géométrie
    // L'API IGN ne retourne pas de champ de surface préalculé
    let surface: number | undefined = undefined;
    
    if (parcel.geometry) {
      try {
        // Utiliser Turf.js pour calculer la surface en m²
        const area = turf.area(parcel.geometry);
        surface = Math.round(area); // Arrondir à l'entier le plus proche
      } catch (error) {
        console.error('Erreur calcul surface:', error);
      }
    }

    return NextResponse.json({
      success: true,
      cadastralReference,
      details: {
        section: props.section,
        numero: props.numero,
        commune: props.nom_com,
        codeCommune: props.code_com,
        codeDepartement: props.code_dep,
        surface: surface,
        feuille: props.feuille
      }
    });

  } catch (error: any) {
    console.error("Erreur cadastre:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Erreur lors de la recherche cadastrale",
        details: error.message 
      },
      { status: 500 }
    );
  }
}
