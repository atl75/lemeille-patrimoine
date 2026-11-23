#!/usr/bin/env node
/** Après build : contrats HTTP DVF/cadastre sur copie sans données ni secrets. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { createHmac } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
await fs.access(path.join(root, '.next/BUILD_ID'));
const dir = await fs.mkdtemp(path.join(tmpdir(), 'lp-geocoding-smoke-'));
const socket = createServer().listen(0, '127.0.0.1');
await once(socket, 'listening');
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const base = `http://127.0.0.1:${port}`;
const secret = 'fictif-local-geocoding-only';
const expiry = String(Date.now() + 600000);
const cookie = `lp_admin=${expiry}.${createHmac('sha256', secret).update(expiry).digest('hex')}`;
let child;
let logs = '';
let checks = 0;
async function call(route, query, auth = true) {
  const cadastre = route === 'cadastre';
  const response = await fetch(`${base}/api/${route}${cadastre ? '?address=' + encodeURIComponent(query) : ''}`, {
    method: cadastre ? 'GET' : 'POST',
    headers: { ...(auth ? { Cookie: cookie } : {}), 'Content-Type': 'application/json' },
    ...(!cadastre ? { body: JSON.stringify({ adresse: query, type: 'Appartement', surface: 80 }) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  if (cadastre) {
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.match(response.headers.get('vary'), /Cookie/);
  }
  return { status: response.status, body: await response.json() };
}
async function check(route, query, status, verify = () => {}, auth = true) {
  const r = await call(route, query, auth);
  assert.equal(r.status, status, `${route} ${query}: ${JSON.stringify(r.body)}`);
  verify(r.body);
  checks++; console.log(`✓ ${route} ${query || '(vide)'} : ${status}`);
}
try {
  execFileSync('rsync', ['-a', '--exclude=.git', '--exclude=node_modules', '--exclude=.env*', '--exclude=data', '--exclude=public/uploads', '--exclude=.next/cache', '--exclude=.next/standalone', root, dir + '/']);
  await fs.symlink(path.join(root, 'node_modules'), path.join(dir, 'node_modules'));
  child = spawn(process.execPath, ['--import', path.join(dir, 'scripts/fixtures/geocodage.mjs'), path.join(dir, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: dir, env: { PATH: process.env.PATH, NODE_ENV: 'production', LP_SANS_GCS: '1', LP_TEST_GEOCODING: '1', SESSION_SECRET: secret, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', chunk => { logs += chunk; }); child.stderr.on('data', chunk => { logs += chunk; });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error('Serveur de recette arrêté');
    try { if ((await fetch(base + '/api/health', { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, 'Serveur de recette indisponible');
  for (const route of ['dvf', 'cadastre']) {
    await check(route, 'INTERDIT-SANS-SESSION', 401, () => {}, false);
    await check(route, ' ', 400);
  }
  assert.doesNotMatch(logs, /FIXTURE geocodage INTERDIT/);
  await check('dvf', { invalid: true }, 400);
  await check('cadastre', 'X'.repeat(201), 400);
  await check('dvf', 'TEST:vide', 404);
  await check('cadastre', 'TEST:vide', 200, b => { assert.equal(b.success, false); assert.match(b.message, /Adresse non trouvée/); });
  for (const route of ['dvf', 'cadastre']) for (const query of ['TEST:http', 'TEST:json', 'TEST:point-invalide']) {
    await check(route, query, 502, b => { assert.match(b.error, /indisponible/); assert.equal(b.details, undefined); });
  }
  await check('cadastre', 'TEST:parcelle-vide', 200, b => { assert.equal(b.success, false); assert.match(b.message, /Aucune parcelle/); });
  for (const query of ['TEST:parcelle-erreur', 'TEST:parcelle-invalide', 'TEST:reference-invalide']) await check('cadastre', query, 502, b => assert.equal(b.details, undefined));
  await check('cadastre', 'TEST:surface-invalide', 200, b => { assert.equal(b.success, true); assert.equal(b.details.surface, undefined); });
  await check('cadastre', 'TEST:ok', 200, b => { assert.equal(b.success, true); assert.equal(b.cadastralReference, 'AB 0001'); assert.equal(b.details.codeCommune, '76540'); assert.ok(b.details.surface > 0); });
  await check('dvf', 'TEST:ok', 200, b => { assert.equal(b.ventes.length, 1); assert.equal(b.stats.medianeM2, 2500); assert.equal(b.stats.nombre, 1); assert.equal(b.lat, 49); assert.equal(b.lon, 1); assert.deepEqual(b.annees, [new Date().getFullYear() - 1]); });
  for (const query of ['TEST:dvf-erreur', 'TEST:dvf-partiel', 'TEST:dvf-invalide']) await check('dvf', query, 502, b => { assert.match(b.error, /Aucun résultat partiel/); assert.equal(b.stats, undefined); assert.equal(b.ventes, undefined); });
  await check('dvf', 'TEST:dvf-absent', 404, b => assert.match(b.error, /ne signifie pas/));
  await check('dvf', 'TEST:dvf-vide', 200, b => { assert.deepEqual(b.ventes, []); assert.equal(b.stats, null); assert.equal(b.anneesAbsentes.length, 4); assert.match(b.information, /Millésimes consultés/); });
  const started = Date.now();
  await check('cadastre', 'TEST:timeout', 502);
  assert.ok(Date.now() - started >= 9000, 'Le scénario lent doit réellement attendre le délai du service');
  assert.match(logs, /FIXTURE parcelle 1/);
  assert.match(logs, /FIXTURE dvf/);
  console.log(`${checks} contrôles HTTP géographiques réussis. Réseau simulé, aucune donnée réelle. Copie : ${dir}`);
} catch (error) {
  console.error(logs.slice(-6000));
  throw error;
} finally {
  child?.kill('SIGTERM');
  if (child && child.exitCode === null) await once(child, 'exit');
}
