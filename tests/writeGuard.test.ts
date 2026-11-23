import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/verifie-ecritures.mjs', import.meta.url));
async function check(source: string, file = 'app/api/test/route.ts') {
  const dir = await mkdtemp(path.join(tmpdir(), 'lp-guard-'));
  try {
    await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
    await writeFile(path.join(dir, file), source);
    return spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' }).status;
  } finally { await rm(dir, { recursive: true, force: true }); }
}
test('garde-fou : appel direct interdit', async () => {
  assert.equal(await check("await writeJSON(FILE, data)"), 1);
});
test('garde-fou : alias importé interdit', async () => {
  assert.equal(await check("import { writeJSON as save } from '@/lib/utils'; await save(FILE, data)"), 1);
});
test('garde-fou : namespace interdit', async () => {
  assert.equal(await check("import * as store from '@/lib/utils'; await store.writeJSON(FILE, data)"), 1);
});
test('garde-fou : commentaires et chaînes ne sont pas des appels', async () => {
  assert.equal(await check("// writeJSON(FILE, data)\nconst s = 'writeJSON(FILE, data)'; await updateJSON(FILE, d => d)"), 0);
});
test('garde-fou : exception OAuth étroite', async () => {
  assert.equal(await check('await writeJSON(TOKEN_FILE, token)', 'lib/googleMail.ts'), 0);
  assert.equal(await check("await writeJSON('properties.json', data)", 'lib/googleMail.ts'), 1);
});
