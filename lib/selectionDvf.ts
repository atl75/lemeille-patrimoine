import { statistiquesDvf, type VenteDvf } from './dvf.ts';

/** Les statistiques utilisées sont celles des lignes accessibles et retenues, jamais celles d'un lot tronqué. */
export function ventesEligibles(observation: any, type: 'Maison' | 'Appartement'): VenteDvf[] {
  const ids = new Set<string>();
  return (Array.isArray(observation?.data?.ventes) ? observation.data.ventes : []).filter((v: any) => {
    if (!v || typeof v.id !== 'string' || !v.id || ids.has(v.id) || v.type !== type ||
        !Number.isFinite(v.prix) || v.prix <= 0 || !Number.isFinite(v.surface) || v.surface <= 0 ||
        !Number.isFinite(v.prix / v.surface)) return false;
    ids.add(v.id); return true;
  }).map((v: VenteDvf) => ({ ...v, prixM2: v.prix / v.surface }));
}

export function selectionDvf(observation: any, type: 'Maison' | 'Appartement') {
  if (!observation?.data) return null;
  const eligibles = ventesEligibles(observation, type);
  const ids = Array.isArray(observation.selectedIds) ? new Set(observation.selectedIds) : null;
  const ventes = ids ? eligibles.filter(v => ids.has(v.id)) : eligibles;
  return { ...observation.data, ventes, stats: statistiquesDvf(ventes),
    selection: { type, disponibles: eligibles.length, retenues: ventes.length,
      totalRecherche: observation.data.stats?.nombre ?? observation.data.ventes?.length ?? 0 } };
}

export function erreurSelectionDvf(observation: any): string | null {
  if (observation?.selectedIds === undefined) return null;
  const ids = observation.selectedIds;
  if (!Array.isArray(ids) || ids.length > 900 || ids.some(id => typeof id !== 'string' || !id || id.length > 200) || new Set(ids).size !== ids.length)
    return 'Sélection DVF invalide : identifiants uniques attendus.';
  const disponibles = new Set([...ventesEligibles(observation, 'Maison'), ...ventesEligibles(observation, 'Appartement')].map(v => v.id));
  if (ids.some(id => !disponibles.has(id))) return 'Sélection DVF invalide : vente absente de la recherche ou inexploitable.';
  return null;
}
