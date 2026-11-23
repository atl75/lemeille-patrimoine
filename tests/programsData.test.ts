import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createProgramReader, programCollection, publicPrograms, findProgramLot } from '../lib/programsData.ts';

const program = { id: 'p-fictif', slug: 'fictif', title: 'Programme fictif', visible: true,
  documents: [{ name: 'Brochure', url: '/brochure.pdf' }], lots: [{ numero: 'A1', prixPlateau: 100000, prixTravaux: 20000, statut: 'VENDU' }, { type: 'T2' }] };
test('programmes : contrat commercial entier conservé sans réécriture des prix ou statuts', () => {
  assert.deepEqual(publicPrograms([program]), [program]);
  assert.equal(publicPrograms([program])[0].lots[0].statut, 'VENDU');
});
test('programmes : masqués exclus, anciens sans indicateur conservés', () => {
  assert.deepEqual(publicPrograms([{ ...program, visible: false }, { ...program, visible: undefined }]), [{ ...program, visible: undefined }]);
});
test('programmes : collection non-tableau refusée, entrées non objets ignorées', () => {
  for (const data of [null, {}, 'erreur']) assert.throws(() => programCollection(data), /Collection programs invalide/);
  assert.deepEqual(publicPrograms([]), []); assert.deepEqual(programCollection([null, 1, [], program]), [program]);
});
test('programmes : slug et ancien identifiant fonctionnent, lots alphanumériques et ordinaux conservés', async () => {
  const reader = createProgramReader(async () => [program]);
  assert.deepEqual(await reader.bySlugOrId('fictif'), program); assert.deepEqual(await reader.bySlugOrId('p-fictif'), program);
  assert.equal(await reader.bySlugOrId('absent'), null);
  assert.equal(findProgramLot(program, 'A1'), program.lots[0]); assert.equal(findProgramLot(program, '2'), program.lots[1]);
  assert.equal(findProgramLot(program, '999'), undefined); assert.equal(findProgramLot({}, '1'), undefined);
});
test('programmes : lecture fraîche, sans cache persistant entre requêtes', async () => {
  let calls = 0;
  const reader = createProgramReader(async (file, options) => {
    assert.equal(file, 'programs.json'); assert.deepEqual(options, { fresh: true });
    return [{ ...program, title: String(++calls) }];
  });
  assert.equal((await reader.bySlugOrId('fictif'))?.title, '1'); assert.equal((await reader.bySlugOrId('fictif'))?.title, '2');
});
test('programmes : masquage effectif à la lecture suivante, sans état admin dans le lecteur public', async () => {
  let visible = true; const reader = createProgramReader(async () => [{ ...program, visible }]);
  assert.ok(await reader.bySlugOrId('fictif')); visible = false;
  assert.equal(await reader.bySlugOrId('fictif'), null); assert.deepEqual(await reader.list(), []);
});
test('programmes : panne propagée au lieu de faux 404, récupération possible', async () => {
  const error = new Error('Stockage indisponible'); let failing = true;
  const reader = createProgramReader(async () => { if (failing) throw error; return [program]; });
  await assert.rejects(reader.bySlugOrId('fictif'), e => e === error); failing = false;
  assert.deepEqual(await reader.bySlugOrId('fictif'), program);
});
test('programmes : deux pages dynamiques utilisant le lecteur commun, sans HTTP interne', () => {
  for (const file of ['../app/programmes/[slug]/page.tsx', '../app/programmes/[slug]/lots/[numero]/page.tsx']) {
    const page = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.match(page, /from "@\/lib\/programPageData"/); assert.match(page, /export const dynamic = "force-dynamic"/);
    assert.doesNotMatch(page, /await fetch\(|async function getProgram/);
  }
  assert.match(readFileSync(new URL('../lib/programPageData.ts', import.meta.url), 'utf8'), /cache\(programReader.bySlugOrId\)/);
});
