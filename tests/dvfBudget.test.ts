import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { getEventListeners } from 'node:events';
import { withDvfBudget, DvfSearchInterrupted } from '../lib/dvfBudget.ts';
import { createDvfSource } from '../lib/dvfSource.ts';
import { geocodeAddress } from '../lib/geocoding.ts';

const header = 'id_mutation,date_mutation,nature_mutation,valeur_fonciere,adresse_numero,adresse_nom_voie,type_local,surface_reelle_bati,nombre_pieces_principales,longitude,latitude';
const isDeadline = (error: unknown) => error instanceof DvfSearchInterrupted && error.reason === 'deadline';

test('budget DVF : géocodage et cinq lectures partagent le même délai, aucune réponse partielle', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let now = 0, completed = 0; const signals: AbortSignal[] = [];
  const load = createDvfSource({ timeoutMs: 30, fetchImpl: async (_, opts) => {
    signals.push(opts!.signal!);
    return new Promise(resolve => setTimeout(() => resolve(new Response(header)), 19));
  } });
  const task = withDvfBudget(async ({ signal, check }) => {
    await geocodeAddress('Fictif', { signal, timeoutMs: 20, fetchImpl: async () => new Promise(resolve => setTimeout(() => resolve(Response.json({ features: [] })), 7)) });
    check();
    for (const year of [2025, 2024, 2023, 2022, 2021]) {
      const result = await load('76540', year, signal); check();
      assert.equal(result.status, 'ok'); completed++;
    }
    return completed;
  }, { timeoutMs: 90, now: () => now });
  const rejected = assert.rejects(task, isDeadline);
  await setImmediate(); now += 7; t.mock.timers.tick(7); await setImmediate();
  for (let i = 0; i < 4; i++) { now += 19; t.mock.timers.tick(19); await setImmediate(); }
  assert.equal(completed, 4); assert.equal(signals.length, 5);
  now = 90; t.mock.timers.tick(7); await rejected;
  assert.equal(signals[4].aborted, true);
  now = 110; t.mock.timers.tick(20); await setImmediate(); assert.equal(completed, 4);
});

test('budget DVF : opération bloquée ignorant le signal bornée et signal transmis annulé', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal: AbortSignal | undefined;
  const task = withDvfBudget(async budget => { signal = budget.signal; return new Promise(() => {}); }, { timeoutMs: 10 });
  const rejected = assert.rejects(task, isDeadline); await setImmediate();
  t.mock.timers.tick(10); await rejected; assert.equal(signal?.aborted, true);
});

test('budget DVF : requête déjà annulée sans géocodage ni téléchargement', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  await assert.rejects(withDvfBudget(async () => ++calls, { signal: controller.signal }), error => error instanceof DvfSearchInterrupted && error.reason === 'client');
  assert.equal(calls, 0);
});

test('budget DVF : déconnexion pendant une étape bloque les étapes suivantes et nettoie les écouteurs', async () => {
  const controller = new AbortController(); let next = false, finish!: () => void;
  const task = withDvfBudget(async ({ check }) => { await new Promise<void>(resolve => { finish = resolve; }); check(); next = true; }, { signal: controller.signal });
  const rejected = assert.rejects(task, error => error instanceof DvfSearchInterrupted && error.reason === 'client');
  await setImmediate(); controller.abort(); await rejected;
  finish(); await setImmediate(); assert.equal(next, false);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('budget DVF : dépassement pendant un calcul synchrone détecté même avant le réveil du timer', async () => {
  let now = 0;
  await assert.rejects(withDvfBudget(async () => { now = 91; return { stats: 'à ne pas afficher' }; }, { now: () => now, timeoutMs: 90 }), isDeadline);
});

test('budget DVF : succès conserve sa valeur et supprime minuterie et écouteur client', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const client = new AbortController(); let signal: AbortSignal | undefined;
  assert.equal(await withDvfBudget(async budget => { signal = budget.signal; return 42; }, { signal: client.signal, timeoutMs: 10 }), 42);
  assert.equal(getEventListeners(client.signal, 'abort').length, 0);
  t.mock.timers.tick(10); client.abort(); assert.equal(signal?.aborted, false);
});

test('budget DVF : exception de parsing nettoie les ressources et reste une erreur', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const client = new AbortController(); const failure = new Error('Parsing fictif'); let signal: AbortSignal | undefined;
  await assert.rejects(withDvfBudget(async budget => { signal = budget.signal; throw failure; }, { signal: client.signal, timeoutMs: 10 }), error => error === failure);
  assert.equal(getEventListeners(client.signal, 'abort').length, 0);
  t.mock.timers.tick(10); assert.equal(signal?.aborted, false);
});

test('budget DVF : recherches simultanées indépendantes', async () => {
  const first = new AbortController(); let secondSignal: AbortSignal | undefined, finish!: () => void;
  const a = withDvfBudget(async () => new Promise(() => {}), { signal: first.signal });
  const b = withDvfBudget(async ({ signal }) => { secondSignal = signal; await new Promise<void>(resolve => { finish = resolve; }); return 'ok'; });
  const rejected = assert.rejects(a, error => error instanceof DvfSearchInterrupted && error.reason === 'client');
  await setImmediate(); first.abort(); await rejected; assert.equal(secondSignal?.aborted, false);
  finish(); assert.equal(await b, 'ok');
});
