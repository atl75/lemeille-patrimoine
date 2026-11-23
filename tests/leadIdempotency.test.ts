import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sauvegarderLeadUnique } from '../lib/leadIdempotency.ts';
import { ErreurDemande, preparerLead, type LeadEntrant } from '../lib/leadIntake.ts';
import { createGcsClient } from '../lib/gcsClient.ts';

const stop = Symbol('sans-ecriture');
const demande = { firstName: 'Fictif', email: 'test@example.com', consent: true, topic: 'Vendre' };
const lead = (id: string, body = demande) => preparerLead(body, false, id, new Date().toISOString(), 'test-cle-unique');

function magasin(initial: LeadEntrant[] = []) {
  let data = structuredClone(initial), generation = 1, writes = 0;
  const client = createGcsClient({ env: { DATA_BUCKET: 'fictif' }, sleep: async () => {}, fetcher: async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === 'metadata.google.internal') return Response.json({ access_token: 'fictif', expires_in: 3600 });
    assert.equal(url.hostname, 'storage.googleapis.com');
    if (init?.method !== 'POST') return Response.json(data, { headers: { 'x-goog-generation': String(generation) } });
    if (url.searchParams.get('ifGenerationMatch') !== String(generation)) return new Response('', { status: 412 });
    data = JSON.parse(String(init.body)); generation++; writes++;
    return Response.json({});
  } });
  return {
    save: (entry: LeadEntrant) => sauvegarderLeadUnique(entry, async mutate => {
      const result = await client.modifierAtomiquement('leads.json', mutate, r => r === stop);
      assert.equal(result.ok, true); return result;
    }, stop),
    rows: () => structuredClone(data), writes: () => writes,
  };
}

test('idempotence : huit soumissions concurrentes, un lead, une seule autorisation de notification', async () => {
  const store = magasin();
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => store.save(lead('L-' + i))));
  assert.equal(store.rows().length, 1); assert.equal(store.writes(), 1);
  assert.equal(new Set(results.map(r => r.id)).size, 1);
  assert.equal(results.filter(r => r.cree).length, 1);
});

test('idempotence : réponse perdue après écriture, même ID après redémarrage du client', async () => {
  const store = magasin(); await store.save(lead('L-original'));
  const redemarre = magasin(store.rows());
  assert.deepEqual(await redemarre.save(lead('L-relance')), { id: 'L-original', cree: false });
  assert.equal(redemarre.writes(), 0);
});

test('idempotence : clé réutilisée avec autre email ou message refusée, aucune donnée remplacée', async () => {
  const store = magasin(); await store.save(lead('L-original'));
  const before = store.rows();
  for (const fields of [{ email: 'autre@example.com' }, { topic: 'Acheter' }]) {
    await assert.rejects(store.save(lead('L-autre', { ...demande, ...fields })), e => e instanceof ErreurDemande && e.status === 409);
  }
  assert.deepEqual(store.rows(), before); assert.equal(store.writes(), 1);
});

test('idempotence : ancienne entrée sans empreinte compatible, champs CRM sans influence', async () => {
  const original = { ...lead('L-ancien'), status: 'qualified', notes: 'Interne' };
  const store = magasin([original]);
  assert.deepEqual(await store.save(lead('L-relance')), { id: 'L-ancien', cree: false });
  assert.equal(store.writes(), 0);
});

test('idempotence : ordre des propriétés et dates serveur sans influence sur la demande', async () => {
  const original = preparerLead({ ...demande, meta: { property: { city: 'Rouen', surface: 80 } } }, false, 'L-original', '2026-09-13T12:00:00Z', 'test-cle-unique');
  const store = magasin(); await store.save(original);
  const next = preparerLead({ ...demande, meta: { property: { surface: 80, city: 'Rouen' } } }, false, 'L-autre', '2026-09-14T12:00:00Z', 'test-cle-unique');
  assert.equal((await store.save(next)).cree, false); assert.equal(store.writes(), 1);
});

test('idempotence : une panne de stockage ne retourne jamais une confirmation', async () => {
  await assert.rejects(sauvegarderLeadUnique(lead('L-test'), async mutate => {
    mutate([]); throw new Error('écriture refusée');
  }, stop), /écriture refusée/);
});

test('idempotence : sans clé, deux demandes restent distinctes', async () => {
  const store = magasin();
  for (const id of ['L-a', 'L-b']) {
    const entry = lead(id); delete entry.idempotencyKey;
    assert.equal((await store.save(entry)).cree, true);
  }
  assert.equal(store.rows().length, 2);
});
