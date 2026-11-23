import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {erreurRapport} from '../lib/rapportComplet.ts';
import {champsEstimation,erreurDonneesEstimation} from '../lib/estimationDossier.ts';
import {creerSnapshot} from '../lib/estimationRapport.ts';
test('rendus historiques V1 et V2 inchangés',()=>{
  for(const [v,hash] of [[1,'82f90ec31483191b59ed1a4226764431dea6c04f4ea81b7bf2098c398fbd8ba5'],[2,'d1581cf8279144a7a20cc268407181c757877201ff1c453dafa96e37fbe6387c']]){
    assert.equal(createHash('sha256').update(readFileSync(new URL(`../components/DocumentEstimationV${v}.tsx`,import.meta.url))).digest('hex'),hash);
  }
});
test('compléments textuels bornés, inconnues autorisées, champs inattendus refusés',()=>{
  for(const r of [null,{}, {documents:'DPE fictif consulté',reserves:''}])assert.equal(erreurRapport(r),null);
  for(const r of [[],true,{documents:3},{documents:'x'.repeat(4001)},{invente:'oui'}])assert.ok(erreurRapport(r));
  assert.ok(erreurDonneesEstimation({rapport:{occupation:[]}}));
});
test('compléments sauvegardés et figés dans le nouveau V4 sans modifier les archives',()=>{
  const rapport={documents:'Documents fictifs',strategie:'Stratégie fictive'};
  assert.deepEqual(champsEstimation({rapport,rendererVersion:0}),{rapport});
  const e={adresse:'TEST',surface:50,baseManuelle:4000,sourceBase:'MANUELLE',rapport};
  const s=creerSnapshot(e,'id-fictif','2026-09-16');
  rapport.documents='Modifié';
  assert.equal(s.rendererVersion,4);assert.equal(s.props.estimation.rapport.documents,'Documents fictifs');
});
