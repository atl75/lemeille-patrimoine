import test from 'node:test';
import assert from 'node:assert/strict';
import { mandatAvecCadastrePourDelegation } from '../lib/cadastreDelegation.ts';

test('missing mandate cadastre is read from the exact linked property without mutation', () => {
  const mandate = { propertyId: 'a', cadastralReference: '', signed: true };
  const property = { id: 'a', cadastralReference: ' AB 123 ' };
  assert.equal(mandatAvecCadastrePourDelegation(mandate, [property]).cadastralReference, 'AB 123');
  assert.equal(mandate.cadastralReference, '');
  assert.equal(property.cadastralReference, ' AB 123 ');
});
test('a recorded mandate reference is preserved even when the property changed', () => {
  const mandate = { propertyId: 'a', cadastre: 'AB 123' };
  assert.equal(mandatAvecCadastrePourDelegation(mandate, [{ id: 'a', cadastralReference: 'CD 456' }]), mandate);
});
test('legacy property references are supported and unrelated properties are never used', () => {
  const mandate = { propertyId: 'a', cadastralReference: '' };
  assert.equal(mandatAvecCadastrePourDelegation(mandate, [{ id: 'a', cadastre: 'AB 123' }]).cadastralReference, 'AB 123');
  assert.equal(mandatAvecCadastrePourDelegation(mandate, [{ id: 'b', cadastralReference: 'CD 456' }]), mandate);
  const unlinked = { cadastralReference: '' };
  assert.equal(mandatAvecCadastrePourDelegation(unlinked, [{ id: 'a', cadastre: 'AB 123' }]), unlinked);
});
test('unavailable or ambiguous property collections refuse the export', () => {
  assert.throws(() => mandatAvecCadastrePourDelegation({ propertyId: 'a' }, null));
  assert.throws(() => mandatAvecCadastrePourDelegation({ propertyId: 'a' }, [{ id: 'a' }, { id: 'a' }]));
});
