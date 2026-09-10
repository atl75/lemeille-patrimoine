import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getClientIp, rateLimit } from '../lib/rateLimit.ts';

const requete = (entetes: Record<string, string>) => new Request('https://x/', { headers: entetes });

test('l’adresse retenue est la DERNIÈRE, celle que l’infrastructure ajoute', () => {
  // Le client contrôle le début de la liste, jamais la fin : chaque relais
  // allonge par la droite. Prendre la première entrée — ce que faisait
  // l'ancienne version — c'était prendre la seule valeur qu'il écrit lui-même.
  assert.equal(getClientIp(requete({ 'x-forwarded-for': '1.2.3.4, 203.0.113.7' })), '203.0.113.7');
});

test('un client ne peut pas se donner un seau neuf en changeant l’en-tête', () => {
  // Le cas qui a fait reprendre le correctif : avec une liste À DEUX ENTRÉES,
  // compter depuis le DÉBUT rendait à l'attaquant sa propre valeur.
  const vrai = '203.0.113.7';
  const vus = new Set<string>();
  for (const invente of ['9.9.9.9', 'a', '', '1.1.1.1, 2.2.2.2', 'x, y, z', '203.0.113.7']) {
    vus.add(getClientIp(requete({ 'x-forwarded-for': `${invente}, ${vrai}` })));
  }
  assert.deepEqual([...vus], [vrai], 'toutes ces requêtes doivent tomber dans le MÊME seau');
});

test('une seule entrée est retenue telle quelle', () => {
  assert.equal(getClientIp(requete({ 'x-forwarded-for': '203.0.113.7' })), '203.0.113.7');
});

test('une liste plus courte que prévu ne sort pas du tableau', () => {
  // PROXY_HOPS pourrait être réglé à 2 derrière un répartiteur ; une requête
  // interne n'ayant qu'une entrée ne doit pas rendre undefined.
  assert.equal(getClientIp(requete({ 'x-forwarded-for': '203.0.113.7' })), '203.0.113.7');
  assert.equal(typeof getClientIp(requete({ 'x-forwarded-for': ' ' })), 'string');
});

test('sans en-tête, on retombe sur x-real-ip puis sur « unknown »', () => {
  assert.equal(getClientIp(requete({ 'x-real-ip': ' 203.0.113.9 ' })), '203.0.113.9');
  assert.equal(getClientIp(requete({})), 'unknown');
});

test('les entrées vides ne décalent pas la position retenue', () => {
  assert.equal(getClientIp(requete({ 'x-forwarded-for': ' , , 1.2.3.4, 203.0.113.7' })), '203.0.113.7');
  assert.equal(getClientIp(requete({ 'x-forwarded-for': ',,,' })), 'unknown');
});

test('le compteur bloque au-delà de la limite et rend un délai', () => {
  const cle = 'test:' + Math.random();
  for (let i = 0; i < 10; i++) assert.equal(rateLimit(cle, 10, 60_000).allowed, true, `essai ${i + 1}`);
  const refus = rateLimit(cle, 10, 60_000);
  assert.equal(refus.allowed, false);
  assert.ok(refus.retryAfterSeconds > 0);
});

test('deux clés distinctes ne se gênent pas', () => {
  const a = 'a:' + Math.random(), b = 'b:' + Math.random();
  for (let i = 0; i < 10; i++) rateLimit(a, 10, 60_000);
  assert.equal(rateLimit(a, 10, 60_000).allowed, false);
  assert.equal(rateLimit(b, 10, 60_000).allowed, true);
});
