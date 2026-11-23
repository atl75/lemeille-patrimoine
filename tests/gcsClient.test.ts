import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGcsClient } from '../lib/gcsClient.ts';
import { COLLECTIONS_PROTEGEES, CollectionAbsente } from '../lib/missingCollection.ts';

// Aucune requête réelle : toute URL passe par ce faux transport obligatoire.
function setup(steps: Array<Response | Error>, env: Record<string, string | undefined> = { DATA_BUCKET: 'test-fictif' }) {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const client = createGcsClient({ env, sleep: async () => {}, fetcher: async (url, init) => {
    requests.push({ url: String(url), init });
    const response = steps.shift();
    if (!response) throw new Error('Requête inattendue');
    if (response instanceof Error) throw response;
    return response;
  } });
  return { client, requests };
}
const token = (expires = 3600) => Response.json({ access_token: 'fictif', expires_in: expires });
const data = (value: unknown, generation = '123') => Response.json(value, { headers: { 'x-goog-generation': generation } });
const stop = Symbol('sans-ecriture');

test('Cloud Run : métadonnées indisponibles bloquent mais un nouvel essai peut réussir', async () => {
  const { client, requests } = setup([new Error('panne'), new Error('panne'), new Error('panne'), token(), data([])], { K_SERVICE: 'fictif' });
  await assert.rejects(client.disponible(), /GCS requis/);
  assert.equal(requests.length, 3);
  assert.deepEqual(await client.lireJSON('test.json'), []);
});
test('jeton malformé refusé', async () => {
  const { client } = setup([Response.json({ access_token: 'fictif' })]);
  await assert.rejects(client.disponible(), /GCS requis/);
});
test('hors GCP non configuré : le chemin local est autorisé', async () => {
  const { client } = setup([new Error('pas de métadonnées')], {});
  assert.equal(await client.disponible(), false);
  assert.equal(await client.ecrireJSON('test.json', []), false);
});
test('les trois garde-fous de test/local empêchent toute requête', async () => {
  for (const env of [{ NODE_TEST_CONTEXT: 'child-v8' }, { NODE_ENV: 'test' }, { LP_SANS_GCS: '1' }]) {
    const { client, requests } = setup([], { DATA_BUCKET: 'fictif', ...env });
    assert.equal(await client.disponible(), false);
    assert.equal((await client.modifierAtomiquement('x', () => assert.fail(), () => false)).ok, false);
    assert.equal(requests.length, 0);
  }
});
test('perte du jeton après activation : erreur, jamais retour local', async () => {
  const { client, requests } = setup([token(1), new Error('panne'), new Error('panne'), new Error('panne')]);
  assert.equal(await client.disponible(), true);
  await assert.rejects(client.ecrireJSON('test.json', []), /Authentification/);
  assert.equal(requests.length, 4);
  assert.equal(requests.filter(r => r.init?.method === 'POST').length, 0);
});

test('métadonnées : reprise des erreurs transitoires uniquement, puis cache du jeton', async () => {
  for (const failure of [new Error('réseau'), new DOMException('délai', 'TimeoutError'), ...[408, 429, 500, 502, 503, 504].map(status => new Response('', { status }))]) {
    const { client, requests } = setup([failure, token(), data([]), data([])]);
    assert.deepEqual(await client.lireJSON('test.json', { fresh: true }), []);
    assert.deepEqual(await client.lireJSON('test.json', { fresh: true }), []);
    assert.equal(requests.filter(r => r.url.includes('metadata.google.internal')).length, 2);
    assert.ok(requests.slice(0, 2).every(r => r.init?.cache === 'no-store' && r.init.signal instanceof AbortSignal));
  }
});
test('métadonnées : refus durables et jetons invalides ne sont pas rejoués', async () => {
  for (const failure of [...[400, 401, 403, 404].map(status => new Response('', { status })), new Response('{oops'), ...[null, {}, { access_token: ' ', expires_in: 100 }, { access_token: 'x', expires_in: 0 }, { access_token: 'x', expires_in: -1 }, { access_token: 'x', expires_in: '3600' }, { access_token: 'x', expires_in: 1e308 }].map(value => Response.json(value))]) {
    const { client, requests } = setup([failure]);
    await assert.rejects(client.disponible(), /GCS requis/);
    assert.equal(requests.length, 1);
  }
});
test('métadonnées : trois essais maximum et deux attentes exponentielles bornées', async () => {
  const delays: number[] = []; let calls = 0;
  const client = createGcsClient({ env: { K_SERVICE: 'fictif' }, sleep: async ms => { delays.push(ms); }, fetcher: async () => { calls++; return new Response('', { status: 503 }); } });
  await assert.rejects(client.disponible(), /GCS requis/);
  assert.equal(calls, 3);
  assert.equal(delays.length, 2);
  assert.ok(delays[0] >= 250 && delays[0] < 350);
  assert.ok(delays[1] >= 500 && delays[1] < 600);
});
test('métadonnées : vingt lectures concurrentes partagent la récupération initiale', async () => {
  const { client, requests } = setup([token(), ...Array.from({ length: 20 }, () => data([]))]);
  await Promise.all(Array.from({ length: 20 }, () => client.lireJSON('test.json', { fresh: true })));
  assert.equal(requests.filter(r => r.url.includes('metadata.google.internal')).length, 1);
  assert.equal(requests.length, 21);
});
test('métadonnées : renouvellement partagé sans utiliser le jeton presque expiré', async () => {
  const { client, requests } = setup([token(1), Response.json({ access_token: 'renouvele-fictif', expires_in: 3600 }), ...Array.from({ length: 20 }, () => data([]))]);
  assert.equal(await client.disponible(), true);
  await Promise.all(Array.from({ length: 20 }, () => client.lireJSON('test.json', { fresh: true })));
  assert.equal(requests.filter(r => r.url.includes('metadata.google.internal')).length, 2);
  assert.ok(requests.slice(2).every(r => new Headers(r.init?.headers).get('Authorization') === 'Bearer renouvele-fictif'));
});
test('métadonnées : échec concurrent partagé puis nouvelle récupération possible', async () => {
  const { client, requests } = setup([new Error('panne'), new Error('panne'), new Error('panne'), token()]);
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => client.disponible()));
  assert.ok(results.every(r => r.status === 'rejected'));
  assert.equal(requests.length, 3);
  assert.equal(await client.disponible(), true);
  assert.equal(requests.length, 4);
});
test('hors GCP non configuré : aucun rejeu ni attente', async () => {
  const { client, requests } = setup([new Error('pas de métadonnées')], {});
  assert.equal(await client.disponible(), false);
  assert.equal(requests.length, 1);
});
test('une écriture réseau ambiguë n’est jamais rejouée automatiquement', async () => {
  const { client, requests } = setup([token(), new Error('réponse perdue')]);
  await assert.rejects(client.ecrireJSON('test.json', []), /réponse perdue/);
  assert.equal(requests.filter(r => r.init?.method === 'POST').length, 1);
});
test('403, 500 et panne réseau ne deviennent pas une collection vide', async () => {
  for (const response of [new Response('', { status: 403 }), new Response('', { status: 500 }), new Error('réseau')]) {
    const { client, requests } = setup([token(), response]);
    await assert.rejects(client.modifierAtomiquement('test.json', () => assert.fail('mutation interdite'), () => false));
    assert.equal(requests.filter(r => r.init?.method === 'POST').length, 0);
  }
});
test('JSON corrompu, vide ou collection objet : aucune écriture', async () => {
  for (const response of [new Response('{oops', { headers: { 'x-goog-generation': '1' } }), new Response('', { headers: { 'x-goog-generation': '1' } }), data({ config: true })]) {
    const { client, requests } = setup([token(), response]);
    await assert.rejects(client.modifierAtomiquement('test.json', () => assert.fail(), () => false));
    assert.equal(requests.length, 2);
  }
});
test('génération absente : pas de fausse précondition de création', async () => {
  const { client } = setup([token(), Response.json([])]);
  await assert.rejects(client.lireJSON('test.json'), /Génération/);
});
test('404 réel : création avec précondition zéro', async () => {
  const { client, requests } = setup([token(), new Response('', { status: 404 }), new Response('', { status: 200 })]);
  await client.modifierAtomiquement('test.json', list => { list.push({ id: 1 }); }, () => false);
  assert.match(requests[2].url, /ifGenerationMatch=0$/);
});
test('GCS : absence des collections protégées bloque lecture et mutation sans POST', async () => {
  for (const file of COLLECTIONS_PROTEGEES) {
    const { client, requests } = setup([token(), new Response('', { status: 404 }), new Response('', { status: 404 })]);
    await assert.rejects(client.lireJSON(file), CollectionAbsente);
    await assert.rejects(client.modifierAtomiquement(file, () => assert.fail('mutation interdite'), () => false), CollectionAbsente);
    assert.equal(requests.length, 3);
    assert.equal(requests.filter(r => r.init?.method === 'POST').length, 0);
  }
});
test('GCS : collection protégée vide mais existante reste utilisable', async () => {
  const { client, requests } = setup([token(), data([], '42'), new Response('', { status: 200 })]);
  await client.modifierAtomiquement('leads.json', rows => { rows.push({ id: 'fictif' }); }, () => false);
  assert.match(requests[2].url, /ifGenerationMatch=42$/);
});
test('GCS : disparition après conflit bloque le rejeu du mutateur et la recréation', async () => {
  const { client, requests } = setup([token(), data([], '42'), new Response('', { status: 412 }), new Response('', { status: 404 })]);
  let mutations = 0;
  await assert.rejects(client.modifierAtomiquement('leads.json', rows => { mutations++; rows.push({ id: 'fictif' }); }, () => false), CollectionAbsente);
  assert.equal(mutations, 1);
  assert.equal(requests.filter(r => r.init?.method === 'POST').length, 1);
  assert.ok(requests.every(r => !r.url.includes('ifGenerationMatch=0')));
});
test('GCS : une absence constatée invalide le cache, puis une restauration est relue', async () => {
  const { client, requests } = setup([token(), data([{ id: 'ancien' }]), new Response('', { status: 404 }), new Response('', { status: 404 }), data([{ id: 'restaure' }])]);
  assert.deepEqual(await client.lireJSON('articles.json'), [{ id: 'ancien' }]);
  await assert.rejects(client.lireJSON('articles.json', { fresh: true }), CollectionAbsente);
  await assert.rejects(client.lireJSON('articles.json'), CollectionAbsente);
  assert.deepEqual(await client.lireJSON('articles.json'), [{ id: 'restaure' }]);
  assert.equal(requests.length, 5);
});
test('conflit 412 : rejoue sur la donnée fraîche sans perdre l’ajout concurrent', async () => {
  const { client, requests } = setup([token(), data([{ id: 1 }], '10'), new Response('', { status: 412 }), data([{ id: 1 }, { id: 2 }], '11'), new Response('', { status: 200 })]);
  let calls = 0;
  await client.modifierAtomiquement('test.json', list => { calls++; list.push({ id: 3 }); }, () => false);
  assert.equal(calls, 2);
  assert.match(requests[2].url, /ifGenerationMatch=10$/);
  assert.match(requests[4].url, /ifGenerationMatch=11$/);
  assert.deepEqual(JSON.parse(String(requests[4].init?.body)), [{ id: 1 }, { id: 2 }, { id: 3 }]);
});
test('six conflits : échec explicite, pas de remplacement sans précondition', async () => {
  const steps = [token(), ...Array.from({ length: 6 }, () => [data([]), new Response('', { status: 412 })]).flat()];
  const { client, requests } = setup(steps);
  await assert.rejects(client.modifierAtomiquement('test.json', () => [], () => false), /6 tentatives/);
  assert.equal(requests.filter(r => r.init?.method === 'POST').length, 6);
  assert.ok(requests.filter(r => r.init?.method === 'POST').every(r => r.url.includes('ifGenerationMatch=')));
});
test('écriture refusée par GCS : erreur remontée', async () => {
  const { client } = setup([token(), new Response('', { status: 403 })]);
  await assert.rejects(client.ecrireJSON('test.json', []), /403/);
});
test('sans écriture : aucune requête POST', async () => {
  const { client, requests } = setup([token(), data([])]);
  assert.deepEqual(await client.modifierAtomiquement('test.json', () => stop, r => r === stop), { ok: true, resultat: stop });
  assert.equal(requests.length, 2);
});
test('cache isolé des mutations du lecteur ; fresh contourne le cache', async () => {
  const { client, requests } = setup([token(), data([{ id: 1 }]), data([{ id: 2 }])]);
  const first = await client.lireJSON('test.json'); first.push({ id: 99 });
  const second = await client.lireJSON('test.json'); second.push({ id: 98 });
  assert.deepEqual(await client.lireJSON('test.json'), [{ id: 1 }]);
  assert.equal(requests.length, 2);
  assert.deepEqual(await client.lireJSON('test.json', { fresh: true }), [{ id: 2 }]);
});
test('les fichiers objets conservent leur forme et le cache est invalidé après écriture', async () => {
  const { client } = setup([token(), data({ refresh_token: 'ancien' }), new Response('', { status: 200 }), data({ refresh_token: 'nouveau' })]);
  assert.deepEqual(await client.lireJSON('token.json'), { refresh_token: 'ancien' });
  await client.ecrireJSON('token.json', { refresh_token: 'nouveau' });
  assert.deepEqual(await client.lireJSON('token.json'), { refresh_token: 'nouveau' });
});
