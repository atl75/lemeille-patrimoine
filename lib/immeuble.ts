export const TYPES_LOT = {APPARTEMENT:'Appartement',LOCAL_COMMERCIAL:'Local commercial',BUREAU:'Bureau',ANNEXE:'Annexe',AUTRE:'Autre'} as const;
export const OCCUPATIONS_LOT = {INCONNU:'Non renseignée',LIBRE:'Libre',OCCUPE:'Occupé'} as const;
export type LotImmeuble = {id:string;label:string;type:keyof typeof TYPES_LOT;surface?:number;occupancy:keyof typeof OCCUPATIONS_LOT};
/** Projection explicite : aucun bail, loyer ni nom de locataire dans les données publiques. */
export function lotsImmeublePublics(p:any): LotImmeuble[] | undefined {
  if(p?.type!=='IMMEUBLE') return undefined;
  return (Array.isArray(p.buildingLots) ? p.buildingLots : []).map((l:any)=>({id:l.id,label:l.label,type:l.type,surface:l.surface,occupancy:l.occupancy}));
}
export function ligneLotImmeuble(l:LotImmeuble): string {
  return `${l.label} - ${TYPES_LOT[l.type] || 'Type non renseigné'} - ${l.surface == null ? 'Surface non renseignée' : l.surface+' m²'} - ${OCCUPATIONS_LOT[l.occupancy] || 'Occupation non renseignée'}`;
}
