import { insertPropertySchema } from '../shared/schema.ts';

/** Validation commune, sans correction automatique d'une donnée métier. */
export function erreurMandatImmeuble(p: any): string | null {
  if(p?.type !== 'IMMEUBLE') return p?.buildingLots?.length ? 'Des lots sont renseignés : vérifiez le type Immeuble.' : null;
  if(!['LIBRE','OCCUPE'].includes(p.occupancy)) return 'Renseignez explicitement l’occupation globale de l’immeuble avant de préparer le mandat.';
  const lots=insertPropertySchema.shape.buildingLots.safeParse(p.buildingLots);
  if(!lots.success || !lots.data?.length) return 'Vérifiez la composition de l’immeuble avant de préparer le mandat.';
  if(lots.data.some(l=>l.occupancy==='OCCUPE') && p.occupancy!=='OCCUPE') return 'Un lot est occupé : vérifiez l’occupation globale avant de préparer le mandat.';
  return null;
}

/** Une archive déjà signée n'est ni recalculée ni réécrite. */
export function archiveMandatImmeuble(p: any): Uint8Array | null {
  if(p?.type!=='IMMEUBLE' || p.mandateSignStatus!=='SIGNED' || typeof p.mandate!=='string') return null;
  const match=/^data:application\/pdf;base64,([A-Za-z0-9+/]+={0,2})$/.exec(p.mandate);
  if(!match)return null;
  const bytes=Buffer.from(match[1],'base64');
  return bytes.subarray(0,5).toString()==='%PDF-' ? bytes : null;
}

export function erreurPdfMandatImmeuble(p:any): string | null {
  return archiveMandatImmeuble(p) ? null : erreurMandatImmeuble(p);
}
