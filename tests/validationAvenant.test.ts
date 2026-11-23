import test from 'node:test';
import assert from 'node:assert/strict';
import { erreurCreationAvenant } from '../lib/validationAvenant.ts';

test('avenant : mandat signé requis, y compris si une seule partie a signé', () => {
  for (const mandateSignStatus of [undefined, 'DRAFT', 'PENDING', 'INVALIDE']) {
    assert.match(erreurCreationAvenant({ mandateSignStatus, signers: [{ dataUrl: 'preuve' }] })!, /doit être signé/);
  }
});
test('avenant : statut signé historique accepté sans réécriture des preuves', () => {
  assert.equal(erreurCreationAvenant({ mandateSignStatus: 'SIGNED' }), null);
  assert.equal(erreurCreationAvenant({ mandateSignStatus: 'SIGNED', avenants: [{ signStatus: 'SIGNED' }] }), null);
});
test('avenant : un acte non terminé ou de statut inconnu bloque le suivant', () => {
  for (const signStatus of [undefined, 'PENDING', 'INVALIDE']) {
    assert.match(erreurCreationAvenant({ mandateSignStatus: 'SIGNED', avenants: [{ signStatus }] })!, /déjà en attente/);
  }
});
test('avenant : validation sans mutation du dossier', () => {
  const mandat = { mandateSignStatus: 'SIGNED', avenants: [{ signStatus: 'PENDING', signers: [{ token: 'fictif' }] }] };
  const before = JSON.stringify(mandat);
  erreurCreationAvenant(mandat);
  assert.equal(JSON.stringify(mandat), before);
});
