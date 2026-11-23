import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentFileFromUrl, isPublicDocument } from '../lib/documentAccess.ts';

const url = '/api/document/abc123.pdf';
test('document inconnu ou privé : refus anonyme', () => {
  assert.equal(isPublicDocument('abc123.pdf', [], []), false);
  for (const field of ['agMinutes', 'titleDeed', 'mandate', 'propertyTax', 'dpeDocument', 'estimation', 'propertyRules', 'chargesStatement']) {
    assert.equal(isPublicDocument('abc123.pdf', [{ [field]: field === 'agMinutes' ? [url] : url }], []), false);
  }
});
test('plans hérités et multiples : autorisés uniquement sur un bien visible', () => {
  for (const props of [{ floorPlan: url }, { floorPlans: [url] }]) {
    assert.equal(isPublicDocument('abc123.pdf', [props], []), true);
    assert.equal(isPublicDocument('abc123.pdf', [{ ...props, visible: false }], []), false);
  }
});
test('une référence privée prévaut même si le fichier est aussi un plan public', () => {
  assert.equal(isPublicDocument('abc123.pdf', [{ floorPlan: url }, { visible: false, agMinutes: [url] }], []), false);
});
test('plans et documents commerciaux explicitement affichés dans les programmes', () => {
  for (const p of [{ plans: [{ image: url }] }, { projections: [{ image: url }] }, { lots: [{ plan: url }] }, { documents: [{ url }] }, { lots: [{ documents: [{ url }] }] }]) {
    assert.equal(isPublicDocument('abc123.pdf', [], [p]), true);
    assert.equal(isPublicDocument('abc123.pdf', [], [{ ...p, visible: false }]), false);
  }
});
test('URL absolue : même origine configurée seulement', () => {
  assert.equal(documentFileFromUrl(`https://lemeillepatrimoine.com${url}`), 'abc123.pdf');
  assert.equal(documentFileFromUrl(`https://evil.test${url}`), null);
  assert.equal(documentFileFromUrl(`https://lemeillepatrimoine.com.evil.test${url}`), null);
  assert.equal(documentFileFromUrl(`http://localhost:3305${url}`, 'http://localhost:3305'), 'abc123.pdf');
});
test('traversée, paramètres, autres chemins et schémas rejetés', () => {
  for (const value of ['/api/document/../abc123.pdf', '/api/document/%2e%2e%2fabc123.pdf', '/api/document/a.svg', `${url}?public=1`, `//evil.test${url}`, `https://user@lemeillepatrimoine.com${url}`, 'data:application/pdf;base64,eA==']) assert.equal(documentFileFromUrl(value), null);
});
test('erreur de collection : refus par défaut', () => {
  assert.equal(isPublicDocument('abc123.pdf', [{ floorPlan: url }], null), false);
  assert.equal(isPublicDocument('abc123.pdf', {}, []), false);
});
