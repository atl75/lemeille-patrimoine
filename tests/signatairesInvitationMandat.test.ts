import test from 'node:test';
import assert from 'node:assert/strict';
import { signatairesInvitationMandat as prepare } from '../lib/signatairesInvitationMandat.ts';
const noToken = () => { throw new Error('Aucun jeton ne doit être créé'); };

test('renvoi : conserve intégralement le signataire signé, sans actualiser ses coordonnées', () => {
  const signed = Object.freeze({ownerIndex:0,token:'ancien',name:'Nom signé',email:'ancien@example.invalid',phone:'ancien',dataUrl:'preuve',signedAt:'date',ip:'ip-fictive',userAgent:'agent-fictif',futureProof:Object.freeze({hash:'empreinte'})});
  const result = prepare([{firstName:'Nouveau',email:'nouveau@example.invalid'}],[signed],noToken);
  assert.deepEqual(result.signers,[signed]);assert.notEqual(result.signers?.[0],signed);
});
test('renvoi : jeton non signé conservé et coordonnées non signées actualisées', () => {
  const result = prepare([{firstName:'TEST',lastName:'FICTIF',email:'nouveau@example.invalid'}],[{ownerIndex:0,token:'stable'}],noToken);
  assert.deepEqual(result.signers,[{ownerIndex:0,token:'stable',name:'TEST FICTIF',email:'nouveau@example.invalid',phone:''}]);
});
test('renvoi : nouveau mandant et représentant de société, sans modifier la source', () => {
  const owners=Object.freeze([{type:'COMPANY',name:'SOCIETE TEST',managerFirstName:'TEST',managerLastName:'GERANT'}]);
  const result=prepare([...owners],[],()=> 'nouveau');
  assert.equal(result.signers?.[0].name,'TEST GERANT');assert.equal(result.signers?.[0].token,'nouveau');
  assert.equal(prepare([{type:'COMPANY',name:'SOCIETE TEST'}],[],()=> 'n').signers?.[0].name,'SOCIETE TEST');
});
test('renvoi : refuse de perdre un signataire signé orphelin ou sans index', () => {
  for (const ownerIndex of [undefined,-1,1,0.5,'0']) assert.ok(prepare([{}],[{ownerIndex,dataUrl:'preuve'}],noToken).error);
});
test('renvoi : refuse un index signé dupliqué', () => {
  assert.ok(prepare([{}],[{ownerIndex:0,dataUrl:'preuve'},{ownerIndex:0,token:'autre'}],noToken).error);
});
test('renvoi : refuse une signature incomplète et une entrée invalide', () => {
  assert.ok(prepare([{}],[{ownerIndex:0,signedAt:'date'}],noToken).error);
  assert.ok(prepare([{}],[null],noToken).error);
});
test('renvoi : conserve les associations explicites malgré l’ordre du tableau', () => {
  const signed={ownerIndex:1,dataUrl:'preuve',name:'Déjà signé'};
  assert.deepEqual(prepare([{},{}],[signed,{ownerIndex:0,token:'stable'}],noToken).signers?.[1],signed);
});
