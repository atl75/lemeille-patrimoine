import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerEnvoiDemandePublique, envoyerDemandePublique } from '../lib/publicLeadRequest.ts';

test('reprise : réponse perdue puis confirmation avec la même clé, nouvelle clé après succès', async () => {
  const keys: string[] = []; let counter = 0;
  const envoyer = creerEnvoiDemandePublique(async (_url, init) => {
    keys.push(new Headers(init?.headers).get('Idempotency-Key')!);
    if (keys.length === 1) throw new Error('réponse perdue');
    return Response.json({ success: true, id: 'L-premier' });
  }, 1000, () => `fictif-${++counter}`);
  await assert.rejects(envoyer({ message: 'Vendre' }), /perdue/);
  assert.equal(await envoyer({ message: 'Vendre' }), 'L-premier');
  await envoyer({ message: 'Vendre' });
  assert.deepEqual(keys, ['fictif-1', 'fictif-1', 'fictif-2']);
});

test('reprise : coordonnées, message ou guide modifiés produisent une nouvelle clé', async () => {
  const keys: string[] = []; let counter = 0;
  const envoyer = creerEnvoiDemandePublique(async (_url, init) => {
    keys.push(new Headers(init?.headers).get('Idempotency-Key')!);
    throw new Error('réponse perdue');
  }, 1000, () => `fictif-${++counter}`);
  for (const payload of [
    { email: 'test@example.com', message: 'Vendre', meta: { guide: 'a' } },
    { email: 'corrige@example.com', message: 'Vendre', meta: { guide: 'a' } },
    { email: 'corrige@example.com', message: 'Estimation', meta: { guide: 'a' } },
    { email: 'corrige@example.com', message: 'Estimation', meta: { guide: 'b' } },
  ]) await assert.rejects(envoyer(payload), /perdue/);
  assert.equal(new Set(keys).size, 4);
});

test('reprise : double clic partage le transport, un autre contenu en cours est refusé', async () => {
  let resolve!: (r: Response) => void; let calls = 0;
  const envoyer = creerEnvoiDemandePublique(async () => { calls++; return new Promise(r => { resolve = r; }); });
  const first = envoyer({ message: 'Vendre' });
  const second = envoyer({ message: 'Vendre' });
  assert.equal(first, second);
  await assert.rejects(envoyer({ message: 'Autre' }), /déjà en cours/);
  resolve(Response.json({ success: true, id: 'L-unique' }));
  assert.deepEqual(await Promise.all([first, second]), ['L-unique', 'L-unique']);
  assert.equal(calls, 1);
});

test('reprise : succès tardif après expiration ne libère pas la clé de la tentative suivante', async () => {
  let late!: (r: Response) => void; const keys: string[] = [];
  const envoyer = creerEnvoiDemandePublique(async (_url, init) => {
    keys.push(new Headers(init?.headers).get('Idempotency-Key')!);
    if (keys.length === 1) return new Promise(r => { late = r; });
    late(Response.json({ success: true, id: 'L-ancien' }));
    return Response.json({ success: true, id: 'L-unique' });
  }, 15);
  await assert.rejects(envoyer({ message: 'Vendre' }), /délai/);
  assert.equal(await envoyer({ message: 'Vendre' }), 'L-unique');
  assert.equal(keys[0], keys[1]);
});

test('reprise : faux succès HTTP conserve la clé et les instances sont indépendantes', async () => {
  const keys: string[] = [];
  const transport: typeof fetch = async (_url, init) => {
    keys.push(new Headers(init?.headers).get('Idempotency-Key')!); return Response.json({});
  };
  const premier = creerEnvoiDemandePublique(transport);
  const second = creerEnvoiDemandePublique(transport);
  await assert.rejects(premier({ message: 'Vendre' }));
  await assert.rejects(premier({ message: 'Vendre' }));
  await assert.rejects(second({ message: 'Vendre' }));
  assert.equal(keys[0], keys[1]); assert.notEqual(keys[1], keys[2]);
});

test('envoi public : un transport bloqué expire sans relance ni fausse confirmation', async () => {
  let calls = 0;
  let signal: AbortSignal | null | undefined;
  await assert.rejects(envoyerDemandePublique({}, async (_url, init) => {
    calls++; signal = init?.signal;
    return new Promise<Response>(() => {});
  }, 10), /a peut-être été enregistrée/);
  assert.equal(calls, 1);
  assert.equal(signal?.aborted, true);
});

test('envoi public : délai appliqué aussi au corps JSON bloqué', async () => {
  await assert.rejects(envoyerDemandePublique({}, async () => ({
    ok: true, json: () => new Promise(() => {}),
  } as unknown as Response), 10), /délai de confirmation/);
});

test('envoi public : une réussite retire le minuteur et ne sera pas annulée ensuite', async () => {
  let signal: AbortSignal | null | undefined;
  assert.equal(await envoyerDemandePublique({}, async (_url, init) => {
    signal = init?.signal;
    return Response.json({ success: true, id: 'L-local' });
  }, 10), 'L-local');
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(signal?.aborted, false);
});

test('envoi public : l’annulation réelle du transport garde le message explicite', async () => {
  await assert.rejects(envoyerDemandePublique({}, async (_url, init) => new Promise<Response>((_, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Annulé', 'AbortError')), { once: true });
  }), 10), /Avant de la renvoyer, contactez Arthur/);
});
