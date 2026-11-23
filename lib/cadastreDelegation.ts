import { referenceCadastraleMandat } from './referenceCadastraleMandat.ts';

type Mandate = { propertyId?: unknown; cadastralReference?: unknown; cadastre?: unknown };

/** Enrich the export only, never alter the stored mandate or guess an association. */
export function mandatAvecCadastrePourDelegation<T extends Mandate>(mandate: T, properties: unknown): T {
  if (referenceCadastraleMandat(mandate)) return mandate;
  if (typeof mandate.propertyId !== 'string' || !mandate.propertyId.trim()) return mandate;
  if (!Array.isArray(properties)) throw new Error('Collection des biens indisponible');
  const linked = properties.filter(p => p && p.id === mandate.propertyId);
  if (linked.length > 1) throw new Error('Association au bien ambiguë');
  const cadastralReference = linked.length === 1 ? referenceCadastraleMandat(linked[0]) : undefined;
  return cadastralReference ? { ...mandate, cadastralReference } : mandate;
}
