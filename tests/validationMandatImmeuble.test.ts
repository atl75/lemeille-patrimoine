import {test} from 'node:test';
import assert from 'node:assert/strict';
import {erreurMandatImmeuble,archiveMandatImmeuble,erreurPdfMandatImmeuble} from '../lib/validationMandatImmeuble.ts';
const bien={type:'IMMEUBLE',occupancy:'LIBRE',buildingLots:[{id:'a',label:'Lot A',type:'APPARTEMENT',occupancy:'LIBRE',surface:42}]};
test('mandat immeuble : occupation explicite, composition valide et cohérente',()=>{
 assert.equal(erreurMandatImmeuble(bien),null);
 for(const p of [{...bien,occupancy:undefined},{...bien,buildingLots:[]},{...bien,buildingLots:[{...bien.buildingLots[0],surface:-1}]},{...bien,buildingLots:[{...bien.buildingLots[0],occupancy:'OCCUPE'}]},{...bien,type:'APPARTEMENT'}])assert.ok(erreurMandatImmeuble(p));
 assert.equal(erreurMandatImmeuble({...bien,occupancy:'OCCUPE',buildingLots:[{...bien.buildingLots[0],occupancy:'OCCUPE'}]}),null);
});
test('aucune réécriture ni règle nouvelle pour les maisons/appartements historiques',()=>{
 const ancien={type:'MAISON',occupancy:undefined};const before=structuredClone(ancien);
 assert.equal(erreurMandatImmeuble(ancien),null);assert.deepEqual(ancien,before);
});
test('archive signée : octets inchangés, sans revalidation ni recalcul de son contenu',()=>{
 const bytes=Buffer.from('%PDF-1.7\narchive fictive de test');
 const p={...bien,occupancy:undefined,mandateSignStatus:'SIGNED',mandate:'data:application/pdf;base64,'+bytes.toString('base64')};
 assert.deepEqual(archiveMandatImmeuble(p),bytes);assert.equal(erreurPdfMandatImmeuble(p),null);
 assert.ok(erreurMandatImmeuble(p),'Une archive ne permet pas de créer un nouveau mandat invalide');
 assert.equal(archiveMandatImmeuble({...p,mandateSignStatus:'PENDING'}),null);
 assert.ok(erreurPdfMandatImmeuble({...p,mandate:'https://example.invalid/archive.pdf'}));
 assert.equal(archiveMandatImmeuble({...p,mandate:'data:application/pdf;base64,aW52YWxpZGU='}),null);
});
