import test from 'node:test';
import assert from 'node:assert/strict';
import { referenceCadastraleMandat } from '../lib/referenceCadastraleMandat.ts';

test('mandat : reprend la référence cadastrale de la fiche bien CRM', () => {
  assert.equal(referenceCadastraleMandat({ cadastralReference: ' Rouen, AB 123 ' }), 'Rouen, AB 123');
});
test('mandat : ancien champ conservé en repli, champ canonique prioritaire', () => {
  assert.equal(referenceCadastraleMandat({ cadastre: 'AB 123' }), 'AB 123');
  assert.equal(referenceCadastraleMandat({ cadastralReference: 'AC 456', cadastre: 'AB 123' }), 'AC 456');
});
test('mandat : ne fabrique pas de référence et ne modifie pas la source', () => {
  const source = Object.freeze({ cadastralReference: '  ', cadastre: 42 });
  assert.equal(referenceCadastraleMandat(source), undefined);
  assert.equal(referenceCadastraleMandat({}), undefined);
  assert.equal(source.cadastralReference, '  ');
});
