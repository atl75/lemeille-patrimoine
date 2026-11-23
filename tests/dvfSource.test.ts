import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { createDvfSource, validDvfHeader } from '../lib/dvfSource.ts';
const header = 'id_mutation,date_mutation,nature_mutation,valeur_fonciere,adresse_numero,adresse_nom_voie,type_local,surface_reelle_bati,nombre_pieces_principales,longitude,latitude';
const ok = () => new Response(header + '\n');
test('source DVF : en-têtes attendus, BOM toléré, HTML et CSV incomplets refusés', () => {
  assert.equal(validDvfHeader(header), true);
  assert.equal(validDvfHeader('\uFEFF' + header + '\r\n'), true);
  for (const csv of ['', '<html>indisponible</html>', header.replace('longitude', 'autre')]) assert.equal(validDvfHeader(csv), false);
});
test('source DVF : succès mis en cache six heures puis relu', async () => {
  let now = 0, calls = 0;
  const load = createDvfSource({ now: () => now, fetchImpl: async () => { calls++; return ok(); } });
  assert.equal((await load('76540', 2025)).status, 'ok');
  await load('76540', 2025); assert.equal(calls, 1);
  now = 6 * 60 * 60 * 1000;
  await load('76540', 2025); assert.equal(calls, 2);
});
test('source DVF : éviction du fichier le plus ancien au-delà de la capacité', async () => {
  let calls = 0;
  const load = createDvfSource({ cacheMax: 2, fetchImpl: async () => { calls++; return ok(); } });
  for (const year of [2025, 2024, 2023, 2025]) await load('76540', year);
  assert.equal(calls, 4);
});
test('source DVF : 404 absent, autres HTTP en erreur, aucune panne mise en cache', async () => {
  for (const [status, expected] of [[404, 'absent'], [403, 'error'], [429, 'error'], [500, 'error']] as const) {
    let calls = 0;
    const load = createDvfSource({ fetchImpl: async () => { calls++; return new Response('', { status }); } });
    assert.equal((await load('76540', 2025)).status, expected);
    await load('76540', 2025); assert.equal(calls, 2);
  }
});
test('source DVF : JSON, HTML et réponse vide HTTP 200 sont des erreurs', async () => {
  for (const body of ['', '{}', '<html>erreur</html>']) {
    const load = createDvfSource({ fetchImpl: async () => new Response(body) });
    assert.equal((await load('76540', 2025)).status, 'error');
  }
});
test('source DVF : cache expiré non réutilisé après une panne', async () => {
  let now = 0, calls = 0;
  const load = createDvfSource({ now: () => now, cacheMs: 10, fetchImpl: async () => ++calls === 1 ? ok() : new Response('', { status: 503 }) });
  await load('76540', 2025); now = 10;
  assert.equal((await load('76540', 2025)).status, 'error');
});
test('source DVF : délai maximal même si fetch ignore abort, sans cache tardif', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let resolve!: (r: Response) => void; let signal: AbortSignal | null | undefined; let calls = 0;
  const load = createDvfSource({ timeoutMs: 20, fetchImpl: async (_, opts) => { signal = opts?.signal; return ++calls === 1 ? new Promise(r => { resolve = r; }) : ok(); } });
  const pending = load('76540', 2025); t.mock.timers.tick(20);
  assert.equal((await pending).status, 'error'); assert.equal(signal?.aborted, true);
  resolve(ok()); await setImmediate(); await load('76540', 2025); assert.equal(calls, 2);
});
test('source DVF : délai maximal couvre aussi le corps CSV', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let cancelled = false;
  const load = createDvfSource({ timeoutMs: 20, fetchImpl: async () => new Response(new ReadableStream({ cancel() { cancelled = true; } })) });
  const pending = load('76540', 2025); await setImmediate(); t.mock.timers.tick(20);
  assert.equal((await pending).status, 'error');
  assert.equal(cancelled, true);
});
test('source DVF : minuterie nettoyée après succès et lecture sans cache HTTP', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal: AbortSignal | null | undefined;
  const load = createDvfSource({ timeoutMs: 20, fetchImpl: async (_, opts) => { assert.equal(opts?.cache, 'no-store'); signal = opts?.signal; return ok(); } });
  await load('76540', 2025); t.mock.timers.tick(20); assert.equal(signal?.aborted, false);
});
test('source DVF : erreur réseau explicite', async () => {
  const load = createDvfSource({ fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal((await load('76540', 2025)).status, 'error');
});

test('source DVF : limite exacte en octets et UTF-8 découpé préservé', async () => {
  const csv = '\uFEFF' + header + '\nÉvreux,€';
  const bytes = new TextEncoder().encode(csv);
  const fetchImpl = async () => new Response(new ReadableStream({
    start(controller) { for (const byte of bytes) controller.enqueue(Uint8Array.of(byte)); controller.close(); },
  }));
  const load = createDvfSource({ fetchImpl, maxBytes: bytes.length });
  assert.deepEqual(await load('76540', 2025), { status: 'ok', csv: csv.replace(/^\uFEFF/, '') });
  assert.equal((await createDvfSource({ fetchImpl, maxBytes: bytes.length - 1 })('76540', 2025)).status, 'error');
});

test('source DVF : taille annoncée excessive, flux arrêté avant lecture complète', async () => {
  let cancelled = false;
  const load = createDvfSource({ maxBytes: 200, fetchImpl: async () => new Response(new ReadableStream({
    cancel() { cancelled = true; },
  }), { headers: { 'Content-Length': '201' } }) });
  assert.equal((await load('76540', 2025)).status, 'error');
  assert.equal(cancelled, true);
});

test('source DVF : taille absente ou sous-déclarée, dépassement annulé sans cache partiel', async () => {
  for (const headers of [{}, { 'Content-Length': '1' }] as Record<string, string>[]) {
    let calls = 0, cancelled = false;
    const load = createDvfSource({ maxBytes: 200, fetchImpl: async () => {
      if (++calls > 1) return ok();
      return new Response(new ReadableStream({
        start(controller) { controller.enqueue(new TextEncoder().encode(header + '\n')); controller.enqueue(new Uint8Array(201)); },
        cancel() { cancelled = true; },
      }), { headers });
    } });
    assert.equal((await load('76540', 2025)).status, 'error');
    assert.equal(cancelled, true);
    assert.equal((await load('76540', 2025)).status, 'ok');
    assert.equal(calls, 2);
  }
});

test('source DVF : rupture du flux après un en-tête valide refuse le CSV partiel', async () => {
  let chunks = 0;
  const load = createDvfSource({ fetchImpl: async () => new Response(new ReadableStream({
    pull(controller) {
      if (chunks++ === 0) controller.enqueue(new TextEncoder().encode(header + '\n'));
      else controller.error(new Error('connexion perdue'));
    },
  })) });
  assert.equal((await load('76540', 2025)).status, 'error');
});

test('source DVF : signal externe annule le téléchargement et ne met rien en cache', async () => {
  let cancelled = false; let signal: AbortSignal | null | undefined;
  const controller = new AbortController();
  const load = createDvfSource({ fetchImpl: async (_, options) => {
    signal = options?.signal;
    return new Response(new ReadableStream({ cancel() { cancelled = true; } }));
  } });
  const pending = load('76540', 2025, controller.signal);
  await setImmediate(); controller.abort();
  assert.equal((await pending).status, 'error');
  assert.equal(signal?.aborted, true); assert.equal(cancelled, true);
});

test('source DVF : annulation externe immédiate même si fetch ignore abort, corps tardif rejeté sans cache', async () => {
  let resolve!: (response: Response) => void, calls = 0, cancelled = false;
  const controller = new AbortController();
  const load = createDvfSource({ fetchImpl: async () => ++calls === 1 ? new Promise(r => { resolve = r; }) : ok() });
  const pending = load('76540', 2025, controller.signal); controller.abort();
  assert.equal((await pending).status, 'error');
  resolve(new Response(new ReadableStream({ cancel() { cancelled = true; } })));
  await setImmediate(); assert.equal(cancelled, true);
  assert.equal((await load('76540', 2025)).status, 'ok'); assert.equal(calls, 2);
});

test('source DVF : requête annulée refuse aussi un cache chaud sans le supprimer', async () => {
  let calls = 0; const load = createDvfSource({ fetchImpl: async () => { calls++; return ok(); } });
  await load('76540', 2025);
  const controller = new AbortController(); controller.abort();
  assert.equal((await load('76540', 2025, controller.signal)).status, 'error');
  assert.equal((await load('76540', 2025)).status, 'ok'); assert.equal(calls, 1);
});

test('source DVF : annulation après succès ne touche pas le cache ni le transport terminé', async () => {
  let signal: AbortSignal | null | undefined, calls = 0; const controller = new AbortController();
  const load = createDvfSource({ fetchImpl: async (_, opts) => { signal = opts?.signal; calls++; return ok(); } });
  await load('76540', 2025, controller.signal); controller.abort();
  assert.equal(signal?.aborted, false); await load('76540', 2025); assert.equal(calls, 1);
});
