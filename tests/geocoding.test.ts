import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { parseGeocodedAddress, geocodeAddress, fetchGeographicJson } from '../lib/geocoding.ts';
import { geocodingUrl } from '../lib/geocodingUrl.ts';

const feature = () => ({ geometry: { type: 'Point', coordinates: [1.094523, 49.443268] },
  properties: { citycode: '76540', label: '35 Rue Ganterie 76000 Rouen', type: 'housenumber', score: 0.97 } });
const collection = (f = feature()) => ({ features: [f] });
test('géocodage : URL fixe et modes distincts pour serveur et suggestions', () => {
  const url = new URL(geocodingUrl('  Rouen & q=Paris  '));
  assert.equal(url.origin, 'https://data.geopf.fr');
  assert.equal(url.pathname, '/geocodage/search');
  assert.deepEqual(Object.fromEntries(url.searchParams), { q: 'Rouen & q=Paris', limit: '1', index: 'address', autocomplete: '0' });
  assert.equal(new URL(geocodingUrl('Rouen', true)).searchParams.get('limit'), '8');
  assert.equal(new URL(geocodingUrl('Rouen', true)).searchParams.get('autocomplete'), '1');
});
test('géocodage : projection du point et ordre longitude/latitude', () => {
  assert.deepEqual(parseGeocodedAddress(collection()), { lon: 1.094523, lat: 49.443268, insee: '76540', label: '35 Rue Ganterie 76000 Rouen', precision: 'housenumber', score: 0.97 });
});
test('géocodage : aucun résultat distinct d’une réponse invalide', () => {
  assert.equal(parseGeocodedAddress({ features: [] }), null);
  for (const bad of [null, {}, { features: {} }, { features: [null] }]) assert.throws(() => parseGeocodedAddress(bad));
});
test('géocodage : coordonnées absentes, non numériques ou hors limites rejetées', () => {
  for (const coords of [[], [1], [1, 2, 3], ['1', 2], [NaN, 2], [1, Infinity], [181, 2], [1, -91]]) {
    const f = feature();
    assert.throws(() => parseGeocodedAddress({ features: [{ ...f, geometry: { type: 'Point', coordinates: coords } }] }));
  }
  const f = feature(); f.geometry.type = 'Polygon';
  assert.throws(() => parseGeocodedAddress(collection(f)));
});
test('géocodage : codes INSEE métropole, Corse et outre-mer, sans segment de chemin', () => {
  for (const code of ['76540', '75116', '2A004', '2B033', '97105']) {
    const f = feature(); f.properties.citycode = code;
    assert.equal(parseGeocodedAddress(collection(f))?.insee, code);
  }
  for (const code of ['../76540', '76540?x=y', '', '1234', '2C004']) {
    const f = feature(); f.properties.citycode = code;
    assert.throws(() => parseGeocodedAddress(collection(f)));
  }
});
test('géocodage : libellé, précision et score valides requis', () => {
  for (const patch of [{ label: ' ' }, { type: '' }, { score: -1 }, { score: 1.1 }, { score: NaN }]) {
    const f = feature(); Object.assign(f.properties, patch);
    assert.throws(() => parseGeocodedAddress(collection(f)));
  }
});
test('géocodage : requête sans cache ni cookies, redirection refusée', async () => {
  let calls = 0;
  const point = await geocodeAddress('Rouen', { fetchImpl: async (url, options) => {
    calls++;
    assert.equal(String(url), geocodingUrl('Rouen'));
    assert.equal(options?.cache, 'no-store'); assert.equal(options?.credentials, 'omit');
    assert.equal(options?.redirect, 'error');
    return new Response(JSON.stringify(collection()));
  } });
  assert.equal(calls, 1); assert.equal(point?.insee, '76540');
});
test('géocodage : HTTP 429/500 ne sont pas assimilés à une adresse introuvable', async () => {
  for (const status of [429, 500]) await assert.rejects(geocodeAddress('Rouen', { fetchImpl: async () => new Response('{"features":[]}', { status }) }));
});
test('géocodage : JSON malformé et panne réseau rejetés', async () => {
  await assert.rejects(geocodeAddress('Rouen', { fetchImpl: async () => new Response('invalide') }));
  await assert.rejects(geocodeAddress('Rouen', { fetchImpl: async () => { throw new Error('network'); } }));
});
test('géocodage : délai maximal même si le transport ignore abort, sans relance', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0; let signal: AbortSignal | null | undefined;
  const result = fetchGeographicJson(geocodingUrl('Rouen'), { timeoutMs: 20, fetchImpl: async (_, options) => {
    calls++; signal = options?.signal; return new Promise(() => {});
  } });
  const rejected = assert.rejects(result, /indisponible/);
  t.mock.timers.tick(20); await rejected;
  assert.equal(signal?.aborted, true); assert.equal(calls, 1);
});
test('géocodage : délai maximal également pendant la lecture JSON', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const result = fetchGeographicJson(geocodingUrl('Rouen'), { timeoutMs: 20, fetchImpl: async () => ({ ok: true, json: () => new Promise(() => {}) }) as Response });
  const rejected = assert.rejects(result, /indisponible/);
  await setImmediate(); t.mock.timers.tick(20); await rejected;
});
test('géocodage : minuterie nettoyée après succès', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal: AbortSignal | null | undefined;
  await fetchGeographicJson(geocodingUrl('Rouen'), { timeoutMs: 20, fetchImpl: async (_, options) => { signal = options?.signal; return new Response('{}'); } });
  t.mock.timers.tick(20);
  assert.equal(signal?.aborted, false);
});

test('géocodage : signal déjà annulé ne lance aucun appel', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  await assert.rejects(geocodeAddress('Fictif', { signal: controller.signal, fetchImpl: async () => { calls++; return Response.json(collection()); } }), /annulée/);
  assert.equal(calls, 0);
});

test('géocodage : annulation externe pendant fetch ignorant le signal libère la réponse tardive', async () => {
  const controller = new AbortController(); let resolve!: (response: Response) => void, cancelled = false;
  const result = geocodeAddress('Fictif', { signal: controller.signal, fetchImpl: async () => new Promise(r => { resolve = r; }) });
  const rejected = assert.rejects(result, /annulée/); controller.abort(); await rejected;
  resolve(new Response(new ReadableStream({ cancel() { cancelled = true; } })));
  await setImmediate(); assert.equal(cancelled, true);
});

test('géocodage : annulation externe couvre un corps JSON bloqué', async () => {
  const controller = new AbortController(); let signal: AbortSignal | null | undefined;
  const result = geocodeAddress('Fictif', { signal: controller.signal, fetchImpl: async (_, options) => {
    signal = options?.signal; return { ok: true, json: () => new Promise(() => {}) } as Response;
  } });
  const rejected = assert.rejects(result, /annulée/); await setImmediate(); controller.abort(); await rejected;
  assert.equal(signal?.aborted, true);
});
