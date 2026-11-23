import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactBien, referenceBien, contexteBien, messageAvecBien } from '../lib/propertyContact.ts';
import { preparerLead } from '../lib/leadIntake.ts';
import { messageAgence } from '../lib/leadNotifications.ts';

test('une fiche disponible propose une visite contextualisée, y compris sans statut historique', () => {
  for (const status of [undefined, '', 'AVAILABLE']) {
    assert.deepEqual(contactBien({ id: 'seo-bien', status }), {
      label: 'Demander une visite', href: '/contact?topic=Acheter&ref=seo-bien#form', statut: '',
    });
  }
});
test('les statuts et le booléen vendu empêchent une promesse de visite inadaptée', () => {
  for (const p of [{ status: 'SOLD' }, { sold: true }, { sold: true, status: 'AVAILABLE' }]) {
    assert.equal(contactBien(p).label, 'Parler de ma recherche');
    assert.equal(contactBien(p).statut, 'Vendu');
  }
  assert.equal(contactBien({ status: 'UNDER_OFFER' }).label, 'Parler de ma recherche');
  assert.equal(contactBien({ status: 'UNDER_OFFER' }).statut, 'Sous promesse');
  assert.equal(contactBien({ status: 'OFFER_RECEIVED' }).label, 'Vérifier la disponibilité');
  assert.equal(contactBien({ status: 'OFFER_RECEIVED' }).statut, 'Sous offre');
  assert.equal(contactBien({ status: 'inconnu' }).label, 'Me renseigner sur ce bien');
});
test('une référence ne peut injecter une URL, un chemin, du HTML ou un message', () => {
  for (const value of [undefined, null, {}, '../admin', 'a/b', 'https://example.com', '<script>', 'a\ntexte', 'a?topic=Vendre', 'a'.repeat(101)]) {
    assert.equal(referenceBien(value), '');
    assert.equal(contexteBien(value), '');
    assert.equal(contactBien({ id: value }).href, '/contact?topic=Acheter#form');
  }
  assert.equal(referenceBien('bien_123-ABC'), 'bien_123-ABC');
});
test('la limite de 5000 caractères réserve le contexte sans tronquer le message', () => {
  const ref = 'a'.repeat(100);
  const message = 'é'.repeat(5000 - contexteBien(ref).length);
  assert.equal(messageAvecBien(message, ref).length, 5000);
  assert.ok(messageAvecBien(message, ref).endsWith(message));
  assert.equal(messageAvecBien('Bonjour', ''), 'Bonjour');
});
test('la référence et le message arrivent au CRM et à la notification, avec le rôle acheteur', () => {
  const lead = preparerLead({ firstName: 'Test', email: 'test@example.com', consent: true, topic: 'Acheter',
    message: messageAvecBien('Bonjour <test>', 'seo-bien') }, false, 'test', '2026-09-11T12:00:00Z');
  assert.equal(lead.role, 'ACHETEUR');
  assert.equal(lead.message, 'Bien concerné : seo-bien\n\nBonjour <test>');
  assert.match(messageAgence(lead, 'agence@example.com').html, /Bien concerné : seo-bien<br><br>Bonjour &lt;test&gt;/);
});
