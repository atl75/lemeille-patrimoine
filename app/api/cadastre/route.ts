import { NextRequest, NextResponse } from "next/server";
import * as turf from '@turf/turf';
import { isAdmin } from '@/lib/adminGuard';
import { fetchGeographicJson, geocodeAddress } from '@/lib/geocoding';

const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
});

// API pour rechercher les parcelles cadastrales à partir d'une adresse
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return json({ error: 'Unauthorized' }, 401);
  try {
    const searchParams = req.nextUrl.searchParams;
    const address = searchParams.get('address')?.trim();

    if (!address) {
      return json(
        { error: "Adresse manquante" },
        400
      );
    }
    if (address.length > 200) return json({ error: 'Adresse trop longue (200 caractères maximum).' }, 400);

    // Étape 1: Géocoder l'adresse pour obtenir les coordonnées et le code INSEE
    const point = await geocodeAddress(address);
    if (!point) {
      return json({
        success: false,
        message: "Adresse non trouvée"
      });
    }

    // Étape 2: Rechercher la parcelle cadastrale contenant ce point exact
    // L'API IGN permet de filtrer directement par point géographique
    const { lon, lat } = point;
    
    const cadastreData = await fetchGeographicJson(
      `https://apicarto.ign.fr/api/cadastre/parcelle?geom=${encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [lon, lat] }))}`
    );
    if (!cadastreData || typeof cadastreData !== 'object' || !('features' in cadastreData) || !Array.isArray(cadastreData.features)) {
      throw new Error('Réponse cadastrale invalide');
    }

    // Étape 3: Vérifier qu'une parcelle a été trouvée
    if (cadastreData.features.length === 0) {
      return json({
        success: false,
        message: "Aucune parcelle cadastrale trouvée pour cette adresse précise"
      });
    }

    // Prendre la première parcelle (celle qui contient le point)
    const parcel = cadastreData.features[0];
    const props = parcel?.properties;
    if (typeof props?.section !== 'string' || !props.section.trim() || typeof props?.numero !== 'string' || !props.numero.trim()) {
      throw new Error('Référence cadastrale invalide');
    }

    // Formater la référence cadastrale
    const cadastralReference = `${props.section} ${props.numero}`;

    // Calculer la surface à partir de la géométrie
    // L'API IGN ne retourne pas de champ de surface préalculé
    let surface: number | undefined = undefined;
    
    if (parcel.geometry) {
      try {
        // Utiliser Turf.js pour calculer la surface en m²
        const area = turf.area(parcel.geometry);
        if (Number.isFinite(area) && area > 0) surface = Math.round(area);
      } catch {
        // Une géométrie inexploitable ne doit pas inventer une surface.
      }
    }

    return json({
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

  } catch {
    console.error('Recherche cadastrale : service géographique indisponible ou réponse invalide.');
    return json(
      { 
        success: false,
        error: "Le service géographique est indisponible. Réessayez dans un instant."
      },
      502
    );
  }
}
