// Désignation normalisée d'un bien, utilisée partout sur le site :
// « T2 · 45 m² · Cannes · 350 000 € ».
// - typologie : T{pièces} (ou Maison/Appartement si le nombre de pièces manque)
// - surface, ville, prix (ou « Nous consulter »)

export const propertyTypology = (p: any): string => {
  const isMaison = (p?.type || 'APPARTEMENT') === 'MAISON';
  if (p?.rooms) return `${isMaison ? 'Maison ' : ''}T${p.rooms}`;
  return isMaison ? 'Maison' : 'Appartement';
};

export const propertyPriceLabel = (p: any): string =>
  p?.priceOnRequest ? 'Nous consulter'
    : (p?.price || p?.price === 0) ? `${Math.round(Number(p.price)).toLocaleString('fr-FR')} €` : '';

// Désignation complète (séparateur « · » par défaut).
export function propertyLabel(p: any, opts: { sep?: string; withPrice?: boolean } = {}): string {
  const sep = opts.sep ?? ' · ';
  const parts = [
    propertyTypology(p),
    p?.surface ? `${p.surface} m²` : '',
    p?.city || '',
    opts.withPrice === false ? '' : propertyPriceLabel(p),
  ].filter(Boolean);
  return parts.join(sep);
}

// Variante sans accent/caractère spécial pour les PDF (police Latin-1).
export const propertyLabelPdf = (p: any): string =>
  propertyLabel(p).replace(/m²/g, 'm2').replace(/€/g, 'EUR').replace(/·/g, '-');
