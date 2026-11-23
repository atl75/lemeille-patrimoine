import type { Ajustement, TypeBien } from './estimation.ts';

export const GROUPES_CARACTERISTIQUES = ['etage', 'exposition', 'bruit', 'visavis', 'ensoleillement'] as const;
export type GroupeCaracteristique = typeof GROUPES_CARACTERISTIQUES[number];
export const LIBELLES_CARACTERISTIQUES: Record<GroupeCaracteristique,string> = {
  etage:'Étage et accès par ascenseur', exposition:'Exposition', bruit:'Calme et nuisances',
  visavis:'Vis-à-vis', ensoleillement:'Luminosité observée',
};
export const OPTIONS_CARACTERISTIQUES = {
  exposition: { N:'Nord', NE:'Nord-est', E:'Est', SE:'Sud-est', S:'Sud', SO:'Sud-ouest', O:'Ouest', NO:'Nord-ouest', TRAVERSANT:'Traversant', MULTIPLE:'Plusieurs orientations' },
  bruit: { TRES_CALME:'Très calme', CALME:'Calme', INTERMITTENT:'Nuisances intermittentes', BRUYANT:'Bruyant', NOCTURNE:'Nuisances nocturnes' },
  visavis: { AUCUN:'Sans vis-à-vis', ELOIGNE:'Vis-à-vis éloigné', MODERE:'Vis-à-vis modéré', PROCHE:'Vis-à-vis proche / direct' },
  ensoleillement: { TRES_LUMINEUX:'Très lumineux', LUMINEUX:'Lumineux', MOYEN:'Luminosité moyenne', FAIBLE:'Peu lumineux', TRES_FAIBLE:'Très sombre' },
} as const;
export type CaracteristiquesEstimation = {
  version: 1;
  etage?: number | null;
  ascenseur?: '' | 'OUI' | 'NON' | 'PARTIEL';
  dernierEtage?: boolean;
  exposition?: string;
  bruit?: string;
  visavis?: string;
  ensoleillement?: string;
  visiteLe?: string;
  impacts?: Partial<Record<GroupeCaracteristique,number | null>>;
  notes?: Partial<Record<GroupeCaracteristique,string>>;
  revueCumuls?: string;
  revueCle?: string;
};

export function descriptionCaracteristique(c: CaracteristiquesEstimation, groupe: GroupeCaracteristique): string {
  if(groupe==='etage') {
    if(c.etage == null) return 'Non renseigné';
    const asc = {OUI:'avec ascenseur',NON:'sans ascenseur',PARTIEL:'ascenseur avec marches ou palier restant'};
    return `${c.etage===0?'Rez-de-chaussée':`${c.etage}e étage`}${c.dernierEtage?' (dernier étage)':''} · ${c.ascenseur ? asc[c.ascenseur] : 'ascenseur non renseigné'}`;
  }
  return (OPTIONS_CARACTERISTIQUES[groupe] as Record<string,string>)[c[groupe] || ''] || 'Non renseigné';
}

/** Empreinte des choix relus. Une modification rend la justification précédente caduque. */
export function cleRevueCaracteristiques(c: CaracteristiquesEstimation): string {
  return JSON.stringify([c.etage ?? null,c.ascenseur || '',!!c.dernierEtage,c.visiteLe || '',
    ...GROUPES_CARACTERISTIQUES.map(g=>[g==='etage'?'':c[g] || '',c.impacts?.[g] ?? null,c.notes?.[g] || ''])]);
}

export function erreurCaracteristiques(c: any): string | null {
  if(!c || typeof c!=='object' || Array.isArray(c) || c.version!==1) return 'Format des caractéristiques invalide.';
  const allowed=['version','etage','ascenseur','dernierEtage','exposition','bruit','visavis','ensoleillement','visiteLe','impacts','notes','revueCumuls','revueCle'];
  if(Object.keys(c).some(k=>!allowed.includes(k))) return 'Champ de caractéristiques inconnu.';
  if(c.etage!=null && (!Number.isInteger(c.etage) || c.etage<0 || c.etage>100)) return 'Étage invalide (0 = rez-de-chaussée).';
  if(c.ascenseur!=null && !['','OUI','NON','PARTIEL'].includes(c.ascenseur)) return 'Ascenseur invalide.';
  if(c.dernierEtage!=null && typeof c.dernierEtage!=='boolean') return 'Dernier étage invalide.';
  for(const g of GROUPES_CARACTERISTIQUES) {
    if(g!=='etage' && c[g]!=null && typeof c[g]!=='string') return `Constat invalide : ${g}.`;
    if(g!=='etage' && c[g] && !Object.hasOwn(OPTIONS_CARACTERISTIQUES[g],c[g])) return `Choix invalide : ${g}.`;
  }
  for(const key of ['impacts','notes']) {
    if(c[key]!=null && (typeof c[key]!=='object' || Array.isArray(c[key]) || Object.keys(c[key]).some(k=>!GROUPES_CARACTERISTIQUES.includes(k as GroupeCaracteristique)))) return `${key} invalides.`;
  }
  for(const g of GROUPES_CARACTERISTIQUES) {
    const n=c.impacts?.[g];
    if(n!=null && (typeof n!=='number' || !Number.isFinite(n) || Math.abs(n)>30)) return `Ajustement ${g} : nombre de -30 à +30 attendu (limite technique).`;
    if(c.notes?.[g]!=null && (typeof c.notes[g]!=='string' || c.notes[g].length>1500)) return 'Observation trop longue (1 500 caractères).';
  }
  if(c.visiteLe!=null && typeof c.visiteLe!=='string') return 'Date de visite invalide.';
  if(c.visiteLe && (!/^\d{4}-\d{2}-\d{2}$/.test(c.visiteLe) || !Number.isFinite(Date.parse(c.visiteLe)) || new Date(c.visiteLe).toISOString().slice(0,10)!==c.visiteLe)) return 'Date de visite invalide.';
  for(const k of ['revueCumuls','revueCle']) if(c[k]!=null && (typeof c[k]!=='string' || c[k].length>12000)) return 'Justification invalide.';
  return null;
}

export function alertesCaracteristiques(c: CaracteristiquesEstimation, type: TypeBien): string[] {
  const actif=(g:GroupeCaracteristique)=>Number(c.impacts?.[g])!==0 && c.impacts?.[g]!=null;
  const messages:string[]=[];
  const optique=['exposition','visavis','ensoleillement'] as GroupeCaracteristique[];
  if(optique.filter(actif).length>1) messages.push('Exposition, vis-à-vis et luminosité : vérifier que chaque correction rémunère un effet distinct.');
  if(type==='Appartement' && actif('etage') && optique.some(actif)) messages.push('Étage et qualités visuelles : ne pas compter deux fois la vue, la lumière ou le vis-à-vis du rez-de-chaussée / dernier étage.');
  if(type==='Appartement' && Number(c.etage)>=4 && c.ascenseur==='NON' && Number(c.impacts?.etage)>0) messages.push('Étage élevé sans ascenseur valorisé positivement : justifier cette situation particulière par les références retenues.');
  return messages;
}

/** Le brouillon reste libre. La validation impose un constat, un effet explicite et sa justification. */
export function blocagesCaracteristiques(c: CaracteristiquesEstimation, type: TypeBien): string[] {
  const erreur=erreurCaracteristiques(c); if(erreur)return [erreur];
  const messages:string[]=[];
  for(const g of GROUPES_CARACTERISTIQUES) {
    if(g==='etage' && type!=='Appartement') continue;
    const connu=descriptionCaracteristique(c,g)!=='Non renseigné';
    const impact=c.impacts?.[g];
    if(!connu && impact!=null) messages.push(`${LIBELLES_CARACTERISTIQUES[g]} : renseigner le constat avant son effet.`);
    if(connu && impact==null) messages.push(`${LIBELLES_CARACTERISTIQUES[g]} : saisir un effet, y compris 0 si aucun écart retenu.`);
    if(connu && Number(impact)!==0 && !c.notes?.[g]?.trim()) messages.push(`${LIBELLES_CARACTERISTIQUES[g]} : justifier l’effet par la visite et les références comparables.`);
  }
  if(type==='Appartement' && c.etage!=null && c.etage>0 && !c.ascenseur) messages.push('Préciser la présence et la desserte de l’ascenseur.');
  if(alertesCaracteristiques(c,type).length && (!c.revueCumuls?.trim() || c.revueCle!==cleRevueCaracteristiques(c))) messages.push('Relire et justifier les recouvrements pour ces choix avant de figer.');
  return messages;
}

export function ajustementsCaracteristiques(c: CaracteristiquesEstimation, type: TypeBien): Ajustement[] {
  if(erreurCaracteristiques(c)) return [];
  return GROUPES_CARACTERISTIQUES.filter(g=>g!=='etage' || type==='Appartement').flatMap(g=>{
    const description=descriptionCaracteristique(c,g);
    if(description==='Non renseigné')return [];
    const impact=c.impacts?.[g];
    return [{critere:g,cle:g==='etage'?String(c.etage):c[g]!,libelle:LIBELLES_CARACTERISTIQUES[g],
      modalite:description+(impact==null?' — effet non chiffré':''),pourcent:impact ?? 0,
      source:c.notes?.[g]?.trim() || 'Constat de l’agent ; aucun coefficient automatique',
      fiabilite:'usage' as const,corrige:false,note:'Ajustement manuel relatif aux références retenues, pas une décote universelle.'}];
  });
}
