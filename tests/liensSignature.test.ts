import test from 'node:test';
import assert from 'node:assert/strict';
import { liensSignatureExistants } from '../lib/liensSignature.ts';
const base = 'https://example.invalid';
test('liens : aucune invitation créée si absente', () => {
  assert.deepEqual(liensSignatureExistants({}, base, true), []);
});
test('liens : jetons stables, statut signé et preuves non exposées', () => {
  const record = { signers: [{ token: 'fictif', name: 'TEST', dataUrl: 'preuve', ip: 'privée' }] };
  const before = JSON.stringify(record), links = liensSignatureExistants(record, base);
  assert.equal(links[0].url, base + '/mandat/signer/fictif');
  assert.equal(links[0].signed, true);assert.equal(links[0].deliveryUnknown, true);
  assert.equal('dataUrl' in links[0], false);assert.equal('ip' in links[0], false);
  assert.equal(JSON.stringify(record), before);
});
test('liens : ancien jeton uniquement pour le mandat, pas pour un avenant', () => {
  const old = { mandateSignToken: 'ancien', mandateSignStatus: 'SIGNED' };
  assert.equal(liensSignatureExistants(old, base, true)[0].signed, true);
  assert.deepEqual(liensSignatureExistants(old, base), []);
});
test('liens : jeton absent et caractères spéciaux gérés sans chemin injecté', () => {
  const result = liensSignatureExistants({ signers: [{}, { token: 'a/b?c' }] }, base + '/');
  assert.equal(result[0].url, '');assert.equal(result[1].url, base + '/mandat/signer/a%2Fb%3Fc');
});
