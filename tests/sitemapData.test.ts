import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sitemapSectorSlugs, articleSitemapDate } from '../lib/sitemapData.ts';
import { SECTORS } from '../lib/sectors.ts';

test('sitemap : les sept secteurs promus restent identiques et existent', () => {
  const slugs = sitemapSectorSlugs();
  assert.deepEqual(slugs.sort(), ['rouen-centre', 'rouen-rive-gauche', 'mont-saint-aignan-bois-guillaume', 'bois-guillaume', 'bihorel', 'isneauville', 'mesnil-esnard-franqueville'].sort());
  assert.ok(slugs.every(slug => SECTORS[slug]));
  assert.equal(new Set(slugs).size, slugs.length);
});
test('sitemap : les autres pages de secteur restent définies sans promotion implicite', () => {
  assert.equal(Object.keys(SECTORS).length, 17);
  assert.ok(SECTORS['paris'] && SECTORS['cote-d-azur']);
  assert.equal(sitemapSectorSlugs().includes('paris'), false);
});
test('sitemap : dates métier valides conservées, année bissextile comprise', () => {
  assert.equal(articleSitemapDate('2026-09-11')?.toISOString(), '2026-09-11T00:00:00.000Z');
  assert.equal(articleSitemapDate('2024-02-29')?.toISOString(), '2024-02-29T00:00:00.000Z');
});
test('sitemap : dates absentes, texte libre, jours impossibles et nombres omis', () => {
  for (const value of [undefined, null, '', 'invalide', '2026-02-29', '2026-04-31', '2026-13-01', '11/09/2026', 123, '2026-02-30T09:47:13.200Z', '2026-09-11T25:00:00Z', '2026-09-11T09:00:00']) {
    assert.equal(articleSitemapDate(value), undefined);
  }
});
test('sitemap : horodatages ISO historiques et fuseaux explicites préservés', () => {
  assert.equal(articleSitemapDate('2026-08-28T09:47:13.200Z')?.toISOString(), '2026-08-28T09:47:13.200Z');
  assert.equal(articleSitemapDate('2026-08-28T11:47:13.200+02:00')?.toISOString(), '2026-08-28T09:47:13.200Z');
  assert.equal(articleSitemapDate('2026-08-28T00:10:00+02:00')?.toISOString(), '2026-08-27T22:10:00.000Z');
});
