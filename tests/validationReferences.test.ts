import test from 'node:test';
import assert from 'node:assert/strict';
import { erreurComparables, erreurReference, dateCivileValide } from '../lib/validationReferences.ts';
import { erreurDonneesEstimation } from '../lib/estimationDossier.ts';

const c = { id:'fictif', titre:'Bien fictif', prix:200000, surface:50 };
test('les données valides et inconnues optionnelles restent inchangées', () => {
  const cs=[{...c, dateParution:'2024-02-29', lien:'https://example.com/annonce?id=1', dpe:''}];
  const avant=JSON.stringify(cs);
  assert.equal(erreurComparables(cs),null); assert.equal(JSON.stringify(cs),avant);
  assert.equal(erreurDonneesEstimation({comparables:[],reference:null,dateMiseEnVente:''}),null);
  assert.equal(erreurComparables([{...c, prix:'200000',surface:'50.5'}]),null);
});
test('nombres non finis, coercitions et structures invalides sont refusés', () => {
  for(const v of [Infinity,NaN,'1e309',true,[],[50],{},0,-1,'']) {
    assert.ok(erreurComparables([{...c, surface:v}]));
    assert.ok(erreurComparables([{...c, prixVente:v}]));
  }
  for(const v of [null,{},[null],[[]],Array(41).fill(c)]) assert.ok(erreurComparables(v));
  for(const v of [true,[],{},'1e309']) assert.ok(erreurDonneesEstimation({surface:v}));
});
test('les identifiants répétés sont signalés sans dédupliquer les biens ressemblants', () => {
  assert.ok(erreurComparables([c,c]));
  assert.equal(erreurComparables([c,{...c,id:'autre'}]),null);
  assert.ok(erreurComparables([{...c,id:''}]));
});
test('dates civiles exactes, aucune date inventée', () => {
  assert.equal(dateCivileValide('2024-02-29'),true);
  for(const d of ['2025-02-29','2026-04-31','15/09/2026',true,{}]) {
    assert.equal(dateCivileValide(d),false);
    assert.ok(erreurComparables([{...c,dateParution:d}]));
    assert.ok(erreurDonneesEstimation({dateMiseEnVente:d}));
  }
});
test('liens et textes ne peuvent pas contenir une structure ou un protocole exécutable', () => {
  for(const lien of ['javascript:alert(1)','data:text/html,test','/relatif','https://user:pass@example.com']) assert.ok(erreurComparables([{...c,lien}]));
  for(const titre of [{},[],true,'x'.repeat(4001)]) assert.ok(erreurComparables([{...c,titre}]));
  assert.ok(erreurComparables([{...c,dpe:'Z'}])); assert.ok(erreurComparables([{...c,statut:'INVENTE'}]));
});
test('références : nombres finis et bornes ordonnées, sans modifier les prix', () => {
  assert.equal(erreurReference({m2:4000,bas:3000,haut:5000,source:'Exemple'}),null);
  assert.equal(erreurReference({source:'Brouillon'}),null);
  for(const r of [[],{m2:'1e309'},{m2:true},{bas:5000,haut:3000},{source:[]}]) assert.ok(erreurReference(r));
  assert.ok(erreurDonneesEstimation({reference:{m2:'1e309'}}));
});
