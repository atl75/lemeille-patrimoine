// Projection « publique » d'un bien : ne renvoie que les champs destinés
// aux visiteurs. Retire les données sensibles jamais destinées au public —
// propriétaires, notaires, acquéreur, montants financiers (net vendeur,
// commissions), documents administratifs (titre de propriété, DPE, mandat,
// PV d'AG…) et référence cadastrale.
//
// Confidentialité de l'adresse : en précision « AREA » (zone), l'adresse
// exacte n'est JAMAIS exposée — la requête carte est réduite à la ville.
export function toPublicProperty(p: any) {
  if (!p || typeof p !== 'object') return p;

  const precision = p.map?.precision === 'EXACT' ? 'EXACT' : 'AREA';
  const map = p.map
    ? {
        precision,
        zoom: p.map.zoom,
        query: precision === 'EXACT' ? p.map.query : (p.city || ''),
      }
    : undefined;

  return {
    id: p.id,
    title: p.title,
    type: p.type,
    city: p.city,
    region: p.region,
    price: p.price,
    priceOnRequest: p.priceOnRequest,
    surface: p.surface,
    rooms: p.rooms,
    // Superficie du terrain : pertinente uniquement pour une maison
    landSize: p.type === 'MAISON' ? p.landSize : undefined,
    annexSurface: p.annexSurface,
    propertyTaxAmount: p.propertyTaxAmount,
    coproChargesMonthly: p.coproChargesMonthly,
    description: p.description,
    images: p.images,
    features: p.features,
    dpe: p.dpe,
    videoUrl: p.videoUrl,
    floorPlan: p.floorPlan,
    floorPlans: p.floorPlans,
    featured: p.featured,
    visible: p.visible,
    sold: p.sold,
    status: p.status,
    soldDate: p.soldDate,
    sortOrder: p.sortOrder,
    map,
  };
}
