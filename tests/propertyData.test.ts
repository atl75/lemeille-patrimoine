import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPropertyReader, findProperty } from '../lib/propertyData.ts';

const property = { id: 'fictif', title: 'Fictif', visible: true, city: 'Rouen', price: 100000,
  images: ['/fictif.jpg'], description: 'Description fictive', owners: ['PRIVE'], sellerNotary: 'PRIVE',
  netSellerAmount: 90000, titleDeed: '/prive.pdf', internalFutureField: 'PRIVE',
  map: { precision: 'AREA', query: 'ADRESSE_PRIVEE', zoom: 12 } };

test('bien : le lecteur conserve les champs publics mais jamais les champs internes', async () => {
  const p = await createPropertyReader(async () => [property]).byId('fictif');
  assert.equal(p.title, property.title); assert.equal(p.price, property.price);
  assert.deepEqual(p.images, property.images); assert.equal(p.description, property.description);
  for (const key of ['owners', 'sellerNotary', 'netSellerAmount', 'titleDeed', 'internalFutureField']) assert.equal(p[key], undefined);
});
test('bien : adresse réduite à la ville en zone, adresse exacte seulement si explicitement publique', async () => {
  const reader = createPropertyReader(async () => [property]);
  assert.deepEqual((await reader.byId('fictif')).map, { precision: 'AREA', query: 'Rouen', zoom: 12 });
  const exact = createPropertyReader(async () => [{ ...property, map: { ...property.map, precision: 'EXACT' } }]);
  assert.equal((await exact.byId('fictif')).map.query, 'ADRESSE_PRIVEE');
  assert.equal(property.map.query, 'ADRESSE_PRIVEE');
});
test('bien : masqué ou absent retourne null, statut historique sans visible conservé', async () => {
  const reader = createPropertyReader(async () => [{ ...property, visible: false }, { ...property, id: 'ancien', visible: undefined }]);
  assert.equal(await reader.byId('fictif'), null); assert.equal(await reader.byId('absent'), null);
  assert.equal((await reader.byId('ancien')).id, 'ancien');
});
test('bien : collection invalide refusée, valeurs non objets ignorées', () => {
  for (const data of [null, {}, 'erreur']) assert.throws(() => findProperty(data, 'fictif'), /Collection properties invalide/);
  assert.equal(findProperty([], 'fictif'), null);
  assert.deepEqual(findProperty([null, 3, [], property], 'fictif'), property);
});
test('bien : lecture fraîche à chaque requête, sans dépendance au domaine public', async () => {
  let calls = 0;
  const reader = createPropertyReader(async (file, options) => {
    assert.equal(file, 'properties.json'); assert.deepEqual(options, { fresh: true });
    return [{ ...property, title: String(++calls) }];
  });
  assert.equal((await reader.byId('fictif')).title, '1');
  assert.equal((await reader.byId('fictif')).title, '2');
});
test('bien : le masquage est effectif dès la lecture suivante', async () => {
  let visible = true;
  const reader = createPropertyReader(async () => [{ ...property, visible }]);
  assert.ok(await reader.byId('fictif')); visible = false;
  assert.equal(await reader.byId('fictif'), null);
});
test('bien : panne propagée et récupération sans transformer la panne en 404', async () => {
  const error = new Error('Stockage indisponible'); let failed = true;
  const reader = createPropertyReader(async () => { if (failed) throw error; return [property]; });
  await assert.rejects(reader.byId('fictif'), e => e === error);
  failed = false; assert.equal((await reader.byId('fictif')).id, 'fictif');
});
test('bien : page dynamique et lecteur commun métadonnées/corps, sans auto-appel HTTP', () => {
  const page = readFileSync(new URL('../app/immobilier/biens/[id]/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /from "@\/lib\/propertyPageData"/);
  assert.match(page, /export const dynamic = 'force-dynamic'/);
  assert.doesNotMatch(page, /await fetch\(|async function getProperty/);
  const memo = readFileSync(new URL('../lib/propertyPageData.ts', import.meta.url), 'utf8');
  assert.match(memo, /cache\(propertyReader.byId\)/);
});
