import { test } from 'node:test';
import assert from 'node:assert/strict';
import { erreursBien, erreursContact } from '../lib/estimationValidation.ts';

test('estimation : adresse requise et surface positive finie', () => {
  assert.deepEqual(Object.keys(erreursBien({ city: '  ', surface: '' })), ['city', 'surface']);
  for (const surface of [0, -1, NaN, Infinity]) assert.ok(erreursBien({ city: 'XX', surface }).surface);
  assert.deepEqual(erreursBien({ city: 'XX', surface: 80.5 }), {});
});
test('estimation : téléphone obligatoire, email facultatif et accord obligatoire', () => {
  assert.deepEqual(Object.keys(erreursContact({ phone: '', email: '', consent: false })), ['phone', 'consent']);
  assert.deepEqual(erreursContact({ phone: '0600000000', email: '', consent: true }), {});
});
test('estimation : email fourni invalide signalé, ordre des erreurs stable', () => {
  assert.deepEqual(Object.keys(erreursContact({ phone: 'x', email: 'invalide', consent: false })), ['phone', 'email', 'consent']);
  assert.deepEqual(erreursContact({ phone: '0600000000', email: 'test@example.com', consent: true }), {});
});
