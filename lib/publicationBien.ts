/** Un brouillon peut être incomplet ; une diffusion ne doit pas inventer son DPE. */
export function erreurPublicationBien(b: any): string | null {
  if(b.type!=='IMMEUBLE' && b.buildingLots?.length) return 'Des lots sont renseignés : conservez le type Immeuble ou retirez les lots avant de changer de type.';
  if(b.type==='IMMEUBLE' && b.occupancy==='LIBRE' && b.buildingLots?.some((l:any)=>l.occupancy==='OCCUPE')) return 'Un lot est occupé : l’occupation globale de l’immeuble ne peut pas être « Libre ».';
  if (b.visible === false) return null;
  if(b.type==='IMMEUBLE' && !b.buildingLots?.length) return 'Renseignez au moins un lot avant de publier cet immeuble.';
  if (!b.title?.trim() || !b.city?.trim() || !(b.surface > 0) || !(b.price > 0 || b.priceOnRequest))
    return 'Avant publication, renseignez le titre, la ville, la surface et le prix (ou « nous consulter »).';
  if (!/^[A-G]$/.test(b.dpe?.classEnergy || '') || !/^[A-G]$/.test(b.dpe?.classGES || ''))
    return 'DPE/GES non renseigné : conservez ce dossier en brouillon. Un éventuel cas de dispense doit être traité séparément.';
  return null;
}
