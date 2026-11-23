import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactProgramme, contexteProgramme, lienProgramme, referenceLot } from '../lib/programContact.ts';
import { preparerLead } from '../lib/leadIntake.ts';
import { messageAgence } from '../lib/leadNotifications.ts';

test('programme : sujet reconnu, référence stable et ancre formulaire', () => {
  const url = new URL(contactProgramme('programme-1'), 'https://example.com');
  assert.equal(url.searchParams.get('topic'), 'Défiscalisation');
  assert.equal(url.searchParams.get('programme'), 'programme-1');
  assert.equal(url.searchParams.has('lot'), false);
  assert.equal(url.hash, '#form');
  assert.equal(lienProgramme('programme-1'), '/programmes/programme-1');
});
test('numérotation numérique, alphanumérique et caractères autorisés conservés', () => {
  for (const value of [1, 0, 'A1', 'Étage 2', 'A-1.2']) {
    const url = new URL(contactProgramme('p1', value), 'https://example.com');
    assert.equal(url.searchParams.get('lot'), String(value));
    assert.equal(lienProgramme('p1', value), '/programmes/p1/lots/' + encodeURIComponent(String(value)));
  }
});
test('références malformées : ni injection de chemin ni préfixe trompeur', () => {
  for (const value of [null, {}, '../admin', '<script>', 'a\ntexte', '.', '..', '   ', 'a/b', 'a?topic=Vendre', 'a'.repeat(61)]) {
    assert.equal(referenceLot(value), '');
    assert.equal(contexteProgramme('p1', value), 'Programme concerné : p1\n\n');
  }
  assert.equal(contexteProgramme('../admin', 'A1'), '');
  assert.equal(lienProgramme('', 'A1'), '');
  assert.equal(new URL(contactProgramme('', 'A1'), 'https://example.com').searchParams.has('lot'), false);
});
test('le contexte réserve la limite message et le retrait reste sans préfixe', () => {
  const context = contexteProgramme('p'.repeat(100), 'A'.repeat(60));
  assert.equal((context + 'é'.repeat(5000 - context.length)).length, 5000);
  assert.equal(contexteProgramme('', '') + 'Mon texte', 'Mon texte');
});
test('programme et lot suivent le message dans le CRM et le modèle email', () => {
  const message = contexteProgramme('p1', 'A1') + 'Bonjour <test>';
  const lead = preparerLead({ firstName: 'Test', email: 'test@example.com', consent: true, topic: 'Défiscalisation', message }, false, 'test', '2026-09-13T12:00:00Z');
  assert.equal(lead.message, message);
  assert.match(messageAgence(lead, 'agence@example.com').html, /Programme concerné : p1 — Lot A1<br><br>Bonjour &lt;test&gt;/);
});
