import { test } from 'node:test';
import assert from 'node:assert/strict';
import { galleryIndex, adjacentPhotos } from '../lib/gallery.ts';

test('galerie : navigation circulaire dans les deux sens', () => {
  assert.equal(galleryIndex(4, 4), 0);
  assert.equal(galleryIndex(-1, 4), 3);
  assert.equal(galleryIndex(-9, 4), 3);
  assert.equal(galleryIndex(2.8, 4), 2);
});
test('galerie : index vide ou invalide sans NaN', () => {
  for (const count of [0, -1, 1.5, Infinity]) assert.equal(galleryIndex(3, count), 0);
  assert.equal(galleryIndex(NaN, 4), 0);
  assert.equal(galleryIndex(19, 1), 0);
});
test('galerie : préchargements voisins uniques, limités et hors photo courante', () => {
  assert.deepEqual(adjacentPhotos(0, 0), []);
  assert.deepEqual(adjacentPhotos(0, 1), []);
  assert.deepEqual(adjacentPhotos(0, 2), [1]);
  assert.deepEqual(adjacentPhotos(0, 3), [1, 2]);
  assert.deepEqual(adjacentPhotos(0, 28), [1, 27, 2, 26]);
});
