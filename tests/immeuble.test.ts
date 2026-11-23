import test from 'node:test';
import assert from 'node:assert/strict';
import {insertPropertySchema} from '../shared/schema.ts';
import {BIEN_VIERGE} from '../lib/typesBien.ts';
import {toPublicProperty,toPublicPropertyCard} from '../lib/publicProperty.ts';
import {erreurPublicationBien} from '../lib/publicationBien.ts';
import {erreurDonneesEstimation} from '../lib/estimationDossier.ts';
const lot={id:'a',label:'Lot A',type:'APPARTEMENT',surface:40.5,occupancy:'INCONNU'};
const bien={...BIEN_VIERGE,id:'test',title:'Immeuble fictif',city:'Ville',type:'IMMEUBLE',price:400000,surface:100,description:'Fictif',buildingLots:[lot]};
test('immeuble : schema conserve les lots avec surfaces décimales et occupation inconnue',()=>{
  const r=insertPropertySchema.parse(bien);assert.equal(r.type,'IMMEUBLE');assert.deepEqual(r.buildingLots,[lot]);
});
test('immeuble : lots invalides, privés, doublons ou trop nombreux refusés',()=>{
  for(const buildingLots of [[{...lot,surface:-1}],[{...lot,surface:Infinity}],[{...lot,tenantEmail:'prive@example.invalid'}],[lot,lot],[lot,{...lot,id:'b'}],Array.from({length:51},(_,i)=>({...lot,id:String(i),label:String(i)}))])
    assert.equal(insertPropertySchema.safeParse({...bien,buildingLots}).success,false);
});
test('immeuble : projection minimale, cartes sans détail ni données privées',()=>{
  const p={...bien,buildingLots:[{...lot,tenantEmail:'prive',loyer:700}],owners:[{email:'secret'}]};
  const detail=toPublicProperty(p),carte=toPublicPropertyCard(p);
  assert.deepEqual(detail.buildingLots,[lot]);assert.equal(carte.buildingLotCount,1);assert.ok(!('buildingLots' in carte));
  assert.ok(!JSON.stringify(detail).includes('prive'));assert.ok(!('buildingLots' in toPublicProperty({...p,type:'MAISON'})));
});
test('immeuble : publication et occupation cohérentes, sans inventer de diagnostic',()=>{
  assert.equal(erreurPublicationBien(bien),null);
  assert.match(erreurPublicationBien({...bien,visible:true,buildingLots:[]})!,/lot/);
  assert.match(erreurPublicationBien({...bien,visible:true})!,/DPE/);
  assert.match(erreurPublicationBien({...bien,occupancy:'LIBRE',buildingLots:[{...lot,occupancy:'OCCUPE'}]})!,/occup/);
  assert.match(erreurPublicationBien({...bien,type:'MAISON'})!,/lots/);
});
test('immeuble : ne peut pas passer silencieusement dans le moteur appartement',()=>{
  assert.match(erreurDonneesEstimation({type:'IMMEUBLE'})!,/immeubles/);
});
