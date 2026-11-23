import test from 'node:test';
import assert from 'node:assert/strict';
import { creerSnapshot } from '../lib/estimationRapport.ts';

const base={adresse:'TEST: adresse fictive',surface:50,baseManuelle:4000,sourceBase:'MANUELLE',criteres:{}};
const c={id:'reference-fictive',titre:'Fictif',prix:200000,surface:50};
const date='2026-09-16T07:00:00.000Z';
test('ancien dossier : références invalides refusées à la création d’un nouvel avis',()=>{
  for(const mauvais of [
    {comparables:[{...c,dateParution:'2026-02-30'}]},
    {comparables:[{...c,lien:'javascript:alert(1)'}]},
    {comparables:[c,c]},
    {comparables:[{...c,prix:'1e309'}]},
    {reference:{m2:4000,bas:5000,haut:3000}},
    {surface:true},
  ]) {
    const e={...base,...mauvais}; const avant=JSON.stringify(e);
    assert.throws(()=>creerSnapshot(e,'nouvel-avis',date),/Impossible de figer/);
    assert.equal(JSON.stringify(e),avant);
  }
});
test('un résultat débordant ne devient pas un avis avec montants null',()=>{
  assert.throws(()=>creerSnapshot({...base,baseManuelle:1e308,surface:50},'avis',date),/hors limites/);
});
test('les archives historiques ne sont ni revalidées ni réécrites',()=>{
  const ancien={id:'historique',rendererVersion:1,props:{estimation:{reference:{m2:'ancien'}},texte:'x'.repeat(1500001)}};
  const e={...base,snapshots:[ancien]}; const avant=JSON.stringify(e);
  const nouveau=creerSnapshot(e,'nouvel-avis',date);
  assert.equal(nouveau.props.resultat.valeur,200000);
  assert.equal(JSON.stringify(e),avant);
  assert.equal(nouveau.props.estimation.snapshots,undefined);
});
test('nouvel avis valide reproductible, y compris les nombres historiques textuels',()=>{
  const e={...base,surface:'50',baseManuelle:'4000',comparables:[c]};
  assert.deepEqual(creerSnapshot(e,'avis',date),creerSnapshot(e,'avis',date));
  assert.equal(creerSnapshot(e,'avis',date).rendererVersion,4);
});
