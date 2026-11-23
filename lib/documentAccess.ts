/** Seuls les champs affichés dans une annonce publique autorisent l'accès. */
export const DOCUMENT_FILE = /^[a-zA-Z0-9]+\.(pdf|jpe?g|png|webp)$/;
export const DOCUMENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
};
const PRIVATE_FIELDS = ['titleDeed', 'dpeDocument', 'propertyTax', 'mandate', 'estimation', 'propertyRules', 'chargesStatement', 'agMinutes'];

// Comparaison de l'URL entière : jamais le seul basename d'un site tiers.
// L'origine vient de la configuration, pas du header Host fourni par le client.
export function documentFileFromUrl(value: unknown, siteUrl = 'https://lemeillepatrimoine.com'): string | null {
  if (typeof value !== 'string') return null;
  const relative = value.match(/^\/api\/document\/([a-zA-Z0-9]+\.(?:pdf|jpe?g|png|webp))$/);
  if (relative) return relative[1];
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== new URL(siteUrl).origin || url.username || url.password || url.search || url.hash) return null;
    return url.pathname.match(/^\/api\/document\/([a-zA-Z0-9]+\.(?:pdf|jpe?g|png|webp))$/)?.[1] ?? null;
  } catch { return null; }
}

export function isPublicDocument(file: string, properties: unknown, programs: unknown, siteUrl?: string): boolean {
  // Données indisponibles ou de forme inattendue : refus, pas autorisation.
  if (!DOCUMENT_FILE.test(file) || !Array.isArray(properties) || !Array.isArray(programs)) return false;
  const matches = (value: unknown): boolean => Array.isArray(value)
    ? value.some(matches) : documentFileFromUrl(value, siteUrl) === file;
  // Un PV réutilisé par erreur comme plan reste privé, même sur un bien masqué.
  if ([...properties, ...programs].some(p => p && PRIVATE_FIELDS.some(field => matches(p[field])))) return false;
  const publicDocs = (docs: unknown) => Array.isArray(docs) && docs.some(d => d && matches(d.url));
  return properties.some(p => p && p.visible !== false && (matches(p.floorPlan) || matches(p.floorPlans)))
    || programs.some(p => p && p.visible !== false && (
      publicDocs(p.documents)
      || (Array.isArray(p.lots) && p.lots.some((lot: any) => lot && (matches(lot.plan) || publicDocs(lot.documents))))
      || ['plans', 'projections'].some(field => Array.isArray(p[field]) && p[field].some((plan: any) => plan && matches(plan.image)))
    ));
}
