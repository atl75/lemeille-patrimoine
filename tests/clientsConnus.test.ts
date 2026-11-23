import test from 'node:test';
import assert from 'node:assert/strict';
import { extraireClient, rechercherClients } from '../lib/clientsConnus.ts';

test('recherche insensible aux accents et à l’ordre des mots', () => {
  const sources = [{ source: 'Bien test', value: { firstName: 'Élodie', lastName: 'Martin', email: 'elodie@example.invalid' } }];
  assert.equal(rechercherClients(sources, 'martin elodie').length, 1);
  assert.equal(rechercherClients(sources, 'example.invalid').length, 1);
  assert.equal(rechercherClients(sources, 'e').length, 0);
});
test('ne fusionne pas les homonymes ou les coordonnées contradictoires', () => {
  const sources = ['a@example.invalid', 'b@example.invalid', 'a@example.invalid'].map(email => ({ source: 'Test', value: { firstName: 'Paul', lastName: 'Test', email } }));
  assert.equal(rechercherClients(sources, 'Paul').length, 2);
});
test('copie uniquement les coordonnées et efface les anciennes valeurs absentes', () => {
  const client = extraireClient({ type: 'COMPANY', name: 'SCI Test', siren: '123456789', managerFirstName: 'Paul', secret: 'private', signers: [{}], mandateNumber: 'test' });
  assert.equal(client.managerFirstName, 'Paul');
  assert.equal(client.email, '');
  assert.equal('secret' in client, false);
  assert.equal('signers' in client, false);
  assert.equal('mandateNumber' in client, false);
});
test('limite les résultats sans retourner toute la base', () => {
  assert.equal(rechercherClients(Array.from({ length: 30 }, (_, i) => ({ source: 'Test', value: { lastName: `Client ${i}` } })), 'Client').length, 20);
});
