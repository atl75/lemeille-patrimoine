import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLLECTIONS_PROTEGEES, CollectionAbsente, contenuAbsent } from '../lib/missingCollection.ts';

test('les cinq collections inventoriées sont protégées avec une erreur identifiable', () => {
  assert.deepEqual(COLLECTIONS_PROTEGEES, ['leads.json', 'mandats.json', 'properties.json', 'programs.json', 'articles.json']);
  assert.ok(Object.isFrozen(COLLECTIONS_PROTEGEES));
  for (const file of COLLECTIONS_PROTEGEES) {
    assert.throws(() => contenuAbsent(file), error => error instanceof CollectionAbsente && error.code === 'COLLECTION_ABSENTE' && error.message.includes(file));
  }
});
test('collections auxiliaires : compatibilité conservée, tableaux indépendants', () => {
  const first = contenuAbsent('auxiliaire-fictive.json'); first.push('test');
  assert.deepEqual(contenuAbsent('auxiliaire-fictive.json'), []);
});
