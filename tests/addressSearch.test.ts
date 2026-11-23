import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { addressComponents, addressSearchUrl, createAddressSearch, parseAddressSuggestions, type AddressSearchState } from '../lib/addressSearch.ts';

const feature = (label = '35 Rue Ganterie 76000 Rouen') => ({ properties: { label, city: 'Rouen', postcode: '76000', context: '76, Seine-Maritime, Normandie' } });
const response = (label?: string) => new Response(JSON.stringify({ features: [feature(label)] }));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup(t: TestContext, fetchImpl: typeof fetch) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const states: AddressSearchState[] = [];
  const search = createAddressSearch(state => states.push(state), { fetchImpl, debounceMs: 300, timeoutMs: 6000 });
  t.after(() => search.cancel());
  return { ...search, states, last: () => states.at(-1)! };
}

test('adresses : service IGN officiel, paramètres fixes, requête encodée et nettoyée', () => {
  const url = new URL(addressSearchUrl('  Rue & place ? q=Paris  '));
  assert.equal(url.origin, 'https://data.geopf.fr');
  assert.equal(url.pathname, '/geocodage/search');
  assert.equal(url.searchParams.get('q'), 'Rue & place ? q=Paris');
  assert.equal(url.searchParams.get('index'), 'address');
  assert.equal(url.searchParams.get('limit'), '8');
  assert.equal(url.searchParams.get('autocomplete'), '1');
});
test('adresses : réponse validée, projection minimale, doublons et entrées invalides filtrés', () => {
  assert.throws(() => parseAddressSuggestions(null));
  assert.throws(() => parseAddressSuggestions({ features: {} }));
  assert.deepEqual(parseAddressSuggestions({ features: [null, {}, feature(), feature(), { properties: { label: 3 } }] }), [feature()]);
  assert.deepEqual(parseAddressSuggestions({ features: [{ properties: { label: 'Paris', city: 'Paris', ignored: 'private' } }] }), [{ properties: { label: 'Paris', city: 'Paris', postcode: '', context: '' } }]);
  assert.equal(parseAddressSuggestions({ features: Array.from({ length: 20 }, (_, i) => feature(String(i))) }).length, 8);
});
test('adresses : classement existant et arrondissements conservés', () => {
  assert.deepEqual(addressComponents(feature()), { address: feature().properties.label, city: 'Rouen', region: 'NORMANDIE' });
  assert.equal(addressComponents({ properties: { ...feature().properties, city: 'Paris', postcode: '75016', context: '75, Paris, Île-de-France' } }).city, 'Paris 16e');
  assert.equal(addressComponents({ properties: { ...feature().properties, postcode: '75116', context: 'Île-de-France' } }).city, 'Rouen');
  assert.equal(addressComponents({ properties: { ...feature().properties, context: 'Île-de-France' } }).region, 'PARIS');
  assert.equal(addressComponents({ properties: { ...feature().properties, context: 'Provence-Alpes-Côte d’Azur' } }).region, 'COTE_D_AZUR');
});
test('adresses : moins de trois caractères, aucun appel', t => {
  let calls = 0;
  const s = setup(t, async () => { calls++; return response(); });
  for (const q of ['', '  ', ' r ', 'ru']) s.search(q);
  t.mock.timers.tick(10_000);
  assert.equal(calls, 0);
  assert.equal(s.last().status, 'idle');
});
test('adresses : Grand Est classé Est sans modifier les régions existantes', () => {
  for (const context of ['67, Bas-Rhin, Grand Est', '54, Meurthe-et-Moselle, Grand-Est']) {
    assert.equal(addressComponents({properties:{label:'Adresse fictive',city:'Ville fictive',postcode:'67000',context}}).region,'EST');
  }
  assert.equal(addressComponents(feature()).region,'NORMANDIE');
});
test('adresses : frappes regroupées et appel sans cookies ni referrer', async t => {
  const calls: [unknown, RequestInit | undefined][] = [];
  const s = setup(t, async (url, options) => { calls.push([url, options]); return response(); });
  s.search('rue');
  t.mock.timers.tick(200);
  s.search('rue Ganterie');
  t.mock.timers.tick(299);
  assert.equal(calls.length, 0);
  t.mock.timers.tick(1);
  await setImmediate();
  assert.equal(calls.length, 1);
  assert.equal(new URL(String(calls[0][0])).searchParams.get('q'), 'rue Ganterie');
  assert.equal(calls[0][1]?.credentials, 'omit');
  assert.equal(calls[0][1]?.referrerPolicy, 'no-referrer');
  assert.equal(s.last().status, 'ready');
  t.mock.timers.tick(6000);
  assert.equal(calls[0][1]?.signal?.aborted, false);
  assert.equal(s.last().status, 'ready');
});
test('adresses : une ancienne réponse ignorante de abort ne remplace pas la plus récente', async t => {
  const old = deferred<Response>();
  let calls = 0;
  let signal: AbortSignal | null | undefined;
  const s = setup(t, async (_, options) => { calls++; if (calls === 1) { signal = options?.signal; return old.promise; } return response('Paris'); });
  s.search('Rouen'); t.mock.timers.tick(300);
  s.search('Paris');
  assert.equal(signal?.aborted, true);
  t.mock.timers.tick(300); await setImmediate();
  old.resolve(response('Rouen')); await setImmediate();
  assert.equal(s.last().suggestions[0].properties.label, 'Paris');
});
test('adresses : vider le champ annule la requête et empêche sa réouverture', async t => {
  const pending = deferred<Response>();
  const s = setup(t, async () => pending.promise);
  s.search('Rouen'); t.mock.timers.tick(300);
  s.search('');
  pending.resolve(response()); await setImmediate();
  assert.equal(s.last().status, 'idle');
});
test('adresses : fermeture ou démontage annule attente et requête sans publier', async t => {
  let calls = 0;
  const pending = deferred<Response>();
  const s = setup(t, async () => { calls++; return pending.promise; });
  s.search('Rouen'); s.cancel(); t.mock.timers.tick(300);
  assert.equal(calls, 0);
  s.search('Rouen'); t.mock.timers.tick(300); s.cancel();
  const count = s.states.length;
  pending.resolve(response()); await setImmediate(); t.mock.timers.tick(6000);
  assert.equal(s.states.length, count);
});
test('adresses : délai maximal, annulation et absence de relance automatique', async t => {
  let signal: AbortSignal | null | undefined;
  let calls = 0;
  const pending = deferred<Response>();
  const s = setup(t, async (_, options) => { calls++; signal = options?.signal; return pending.promise; });
  s.search('Rouen'); t.mock.timers.tick(300);
  t.mock.timers.tick(5999); assert.equal(s.last().status, 'loading');
  t.mock.timers.tick(1); assert.equal(s.last().status, 'error'); assert.equal(signal?.aborted, true);
  pending.resolve(response()); await setImmediate(); t.mock.timers.tick(6000);
  assert.equal(s.last().status, 'error'); assert.equal(calls, 1);
});
test('adresses : le délai couvre aussi le décodage du corps JSON', async t => {
  const body = deferred<unknown>();
  const s = setup(t, async () => ({ ok: true, json: () => body.promise }) as Response);
  s.search('Rouen'); t.mock.timers.tick(300); await setImmediate();
  t.mock.timers.tick(6000); assert.equal(s.last().status, 'error');
  body.resolve({ features: [feature()] }); await setImmediate();
  assert.equal(s.last().status, 'error');
});
test('adresses : ancienne erreur sans effet sur le délai de la nouvelle requête', async t => {
  const old = deferred<Response>(); let calls = 0;
  const s = setup(t, async () => ++calls === 1 ? old.promise : new Promise(() => {}));
  s.search('Rouen'); t.mock.timers.tick(300);
  s.search('Paris'); t.mock.timers.tick(300);
  old.reject(new Error('ancienne erreur')); await setImmediate();
  assert.equal(s.last().status, 'loading');
  t.mock.timers.tick(6000); assert.equal(s.last().status, 'error');
});
test('adresses : HTTP en erreur, JSON malformé, panne et réponse vide distingués', async t => {
  const responses = [new Response('{}', { status: 429 }), new Response('invalide'), new Error('offline'), new Response('{"features":[]}')];
  const s = setup(t, async () => { const r = responses.shift()!; if (r instanceof Error) throw r; return r; });
  for (const expected of ['error', 'error', 'error', 'empty']) {
    s.search('Rouen'); t.mock.timers.tick(300); await setImmediate();
    assert.equal(s.last().status, expected);
  }
});
