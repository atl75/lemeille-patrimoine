import { erreurCaracteristiques } from './caracteristiquesEstimation.ts';
import { erreurRapport } from './rapportComplet.ts';
import { erreurSelectionDvf } from './selectionDvf.ts';
import { nombreFini, dateCivileValide, erreurComparables, erreurReference } from './validationReferences.ts';
/** Contrat de sauvegarde partagé. Les archives ne sont jamais modifiables par PATCH. */
export const CHAMPS_ESTIMATION = new Set([
  'leadId', 'propertyId', 'titre', 'demandeur', 'adresse', 'ville', 'type', 'surface', 'pieces', 'terrain',
  'criteres', 'corrections', 'comparables', 'sourceBase', 'reference', 'baseManuelle', 'prixRetenu',
  'honorairesPct', 'honorairesCharge', 'taux', 'dureePret', 'pointsForts', 'pointsFaibles',
  'description', 'commentaire', 'conclusion', 'dvfRayon', 'dvfDepuis', 'dvfPieces', 'dvfSurfaceMin', 'dvfSurfaceMax',
  'dvfTerrainMin', 'dvfTerrainMax', 'dvfObservation',
  'caracteristiques',
  'rapport',
]);

export function champsEstimation(e: Record<string, any>) {
  return Object.fromEntries(Object.entries(e).filter(([k]) => CHAMPS_ESTIMATION.has(k)));
}

export function cleRechercheDvf(e: Record<string, any>): string {
  return JSON.stringify([e.adresse?.trim() || '', e.type === 'Maison' ? 'Maison' : 'Appartement',
    ...['surface','dvfRayon','dvfDepuis','dvfPieces','dvfSurfaceMin','dvfSurfaceMax','dvfTerrainMin','dvfTerrainMax']
      .map(k => Number(e[k]) || (k === 'dvfRayon' ? 300 : 0))]);
}

export function revisionCourante(e: any): number { return Number.isSafeInteger(e?.revision) ? e.revision : 0; }

export function verifierEcriture(e: any, body: any): 'ok' | 'rejoue' | 'conflit' | 'invalide' {
  if (!body || Array.isArray(body) || typeof body !== 'object' ||
      !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0 ||
      typeof body.requestId !== 'string' || body.requestId.length < 8 || body.requestId.length > 100) return 'invalide';
  if (e?.lastRequestId === body.requestId) return 'rejoue';
  return body.expectedRevision === revisionCourante(e) ? 'ok' : 'conflit';
}

export function erreurDonneesEstimation(e: any): string | null {
  if(e.type==='IMMEUBLE' || e.type==='Immeuble') return 'L’estimation standard ne couvre pas les immeubles entiers.';
  const selection = erreurSelectionDvf(e.dvfObservation); if(selection) return selection;
  const erreurComplements = erreurRapport(e.rapport); if(erreurComplements) return erreurComplements;
  if(e.caracteristiques != null) {
    const erreur = erreurCaracteristiques(e.caracteristiques); if(erreur)return erreur;
  }
  for (const k of ['surface','pieces','terrain','baseManuelle','prixRetenu','honorairesPct','taux','dureePret',
    'dvfRayon','dvfDepuis','dvfPieces','dvfSurfaceMin','dvfSurfaceMax','dvfTerrainMin','dvfTerrainMax']) {
    if (e[k] !== undefined && e[k] !== null && e[k] !== '' &&
        (!nombreFini(e[k]) || Number(e[k]) < 0)) return `Valeur invalide : ${k}.`;
  }
  if (Number(e.honorairesPct) > 100) return 'Les honoraires ne peuvent pas dépasser 100 %.';
  if (e.sourceBase && !['DVF','COMPARABLES','REFERENCE','MANUELLE'].includes(e.sourceBase)) return 'Source inconnue.';
  if (e.comparables !== undefined) {
    const erreur = erreurComparables(e.comparables); if (erreur) return erreur;
  }
  if (e.reference != null) {
    const erreur = erreurReference(e.reference); if (erreur) return erreur;
  }
  if (e.dateMiseEnVente != null && e.dateMiseEnVente !== '' && !dateCivileValide(e.dateMiseEnVente)) return 'Date de mise en vente invalide (AAAA-MM-JJ).';
  for (const k of ['criteres','corrections','reference','dvfObservation']) {
    if (e[k] != null && (typeof e[k] !== 'object' || Array.isArray(e[k]))) return `Objet invalide : ${k}.`;
  }
  if (JSON.stringify(e).length > 1500000) return 'Dossier trop volumineux.';
  return null;
}
