import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { load } from 'cheerio';
import { serializeJsonLd } from '../lib/jsonLd.ts';

test('JSON-LD : échappe les délimiteurs HTML sans altérer les données', () => {
  const data = { name: 'Maison <atelier> & jardin', description: 'Été > hiver\u2028Paris\u2029Rouen', price: 345000, available: true, offers: [null, { value: '"\\' }] };
  const output = serializeJsonLd(data);
  assert.doesNotMatch(output, /[<>&\u2028\u2029]/);
  assert.deepEqual(JSON.parse(output), data);
});

test('JSON-LD : une fermeture de script malveillante reste une simple valeur JSON', () => {
  for (const attack of ['</script><script>alert(1)</script>', '</ScRiPt><img src=x onerror=alert(1)>', '<!--<script>texte</script>-->']) {
    const data = { '@type': 'RealEstateListing', name: attack, nested: { content: attack } };
    const $ = load(`<html><head><script type="application/ld+json">${serializeJsonLd(data)}</script></head><body><p>Fin</p></body></html>`);
    assert.equal($('script').length, 1);
    assert.equal($('img').length, 0);
    assert.equal($('body').text(), 'Fin');
    assert.deepEqual(JSON.parse($('script').text()), data);
  }
});

test('JSON-LD : conventions JSON préservées, données non sérialisables refusées', () => {
  assert.equal(serializeJsonLd(null), 'null');
  assert.deepEqual(JSON.parse(serializeJsonLd({ date: new Date('2026-09-11T00:00:00Z'), omitted: undefined })), { date: '2026-09-11T00:00:00.000Z' });
  assert.throws(() => serializeJsonLd(undefined), TypeError);
  assert.throws(() => serializeJsonLd(1n), TypeError);
  const cyclic: { self?: unknown } = {}; cyclic.self = cyclic;
  assert.throws(() => serializeJsonLd(cyclic), TypeError);
});

test('JSON-LD : aucune sortie directe hors du composant sécurisé commun', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const visit = (dir: string): string[] => readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? visit(path.join(dir, entry.name)) : /\.[jt]sx?$/.test(entry.name) ? [path.join(dir, entry.name)] : []);
  const emitters = [...visit('app'), ...visit('components')].filter(file => readFileSync(path.join(root, file), 'utf8').includes('application/ld+json'));
  assert.deepEqual(emitters, ['components/JsonLd.tsx']);
  assert.match(readFileSync(path.join(root, emitters[0]), 'utf8'), /__html: serializeJsonLd\(data\)/);
});
