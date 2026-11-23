import test from 'node:test';
import assert from 'node:assert/strict';
import { EditionMandat, mandatFige } from '../lib/editionMandat.ts';

test('édition mandat : propre puis modifié jusqu’à confirmation', () => {
  const e = new EditionMandat();
  assert.equal(e.nonEnregistre('a'), false);
  e.modifier('a');
  assert.equal(e.nonEnregistre('a'), true);
  assert.equal(e.confirmer('a', e.version('a')), true);
  assert.equal(e.nonEnregistre('a'), false);
});
test('édition mandat : modification pendant sauvegarde conservée', () => {
  const e = new EditionMandat(); e.modifier('a');
  const version = e.version('a'); e.modifier('a');
  assert.equal(e.confirmer('a', version), false);
  assert.equal(e.nonEnregistre('a'), true);
});
test('édition mandat : échec sans confirmation ne perd pas la saisie', () => {
  const e = new EditionMandat(); e.modifier('a');
  e.commencer('a'); e.terminer('a');
  assert.equal(e.nonEnregistre('a'), true);
  assert.equal(e.nonEnregistre('b'), false);
});
test('édition mandat : exclusion synchrone des doubles actions', () => {
  const e = new EditionMandat();
  assert.equal(e.commencer('a'), true);
  assert.equal(e.commencer('a'), false);
  assert.equal(e.enCours('a'), true);
  e.terminer('a'); assert.equal(e.commencer('a'), true);
});
test('édition mandat : gel dès la première preuve ou date', () => {
  assert.equal(mandatFige({}), false);
  assert.equal(mandatFige({ mandateSignStatus: 'PENDING', signers: [{}] }), false);
  assert.equal(mandatFige({ mandateSignStatus: 'SIGNED' }), true);
  assert.equal(mandatFige({ mandateSignature: { dataUrl: 'preuve' } }), true);
  assert.equal(mandatFige({ signers: [{}, { dataUrl: 'preuve' }] }), true);
  assert.equal(mandatFige({ signers: [{ signedAt: '2026-10-02' }] }), true);
});
