#!/usr/bin/env node
/** Pannes et mutations exclusivement sur une copie isolée avec biens fictifs. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { createHmac } from 'node:crypto';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const root = fileURLToPath(new URL('../', import.meta.url));
await fs.access(path.join(root, '.next/BUILD_ID'));
const dir = await fs.mkdtemp(path.join(tmpdir(), 'lp-program-detail-smoke-'));
const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
const base = `http://127.0.0.1:${port}`;
const secret = 'fictif-local-program-only'; const expiry = String(Date.now() + 600_000);
const cookie = `lp_admin=${expiry}.${createHmac('sha256', secret).update(expiry).digest('hex')}`;
const program = { id: 'probe-id', slug: 'probe-public', title: 'Programme fictif initial', visible: true,
  city: 'Rouen', dispositif: 'TEST', summary: 'Résumé fictif', lots: [
    { numero: 'A1', type: 'T2', prixPlateau: 100000, prixTravaux: 20000, statut: 'DISPONIBLE' }, { type: 'T1' },
  ] };
const hidden = { ...program, id: 'probe-hidden', slug: 'probe-hidden', visible: false, title: 'PROGRAMME_MASQUE_FICTIF' };
const file = path.join(dir, 'data/programs.json');
const save = data => fs.writeFile(file, JSON.stringify(data));
const get = (route, admin = false) => fetch(base + route, { headers: { 'User-Agent': 'Googlebot', ...(admin ? { Cookie: cookie } : {}) }, redirect: 'manual', signal: AbortSignal.timeout(30000) });
const privateCache = r => { assert.match(r.headers.get('cache-control'), /private, no-store/); assert.match(r.headers.get('vary'), /Cookie/); };
let child; let serverLog = ''; let checks = 0;
const check = label => { checks++; console.log('✓ ' + label); };
try {
  execFileSync('rsync', ['-a', '--exclude=.git', '--exclude=node_modules', '--exclude=.env*', '--exclude=data', '--exclude=public/uploads', '--exclude=.next/cache', '--exclude=.next/standalone', root, dir + '/']);
  await fs.symlink(path.join(root, 'node_modules'), path.join(dir, 'node_modules'));
  await fs.mkdir(path.join(dir, 'data'), { recursive: true });
  for (const name of ['articles', 'properties', 'reviews', 'leads', 'mandats', 'subscribers', 'custom-features']) await fs.writeFile(path.join(dir, 'data', name + '.json'), '[]');
  await save([program, hidden]);
  child = spawn(process.execPath, [path.join(dir, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: dir, env: { PATH: process.env.PATH, NODE_ENV: 'production', LP_SANS_GCS: '1', SESSION_SECRET: secret,
      RESEND_API_KEY: '', ANTHROPIC_API_KEY: '', NEXT_PUBLIC_SITE_URL: base, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', b => { serverLog += b; }); child.stderr.on('data', b => { serverLog += b; });
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error('Serveur arrêté');
    try { if ((await get('/api/health')).ok) break; } catch { /* démarrage */ }
    if (i === 99) throw new Error('Démarrage trop long');
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  for (const admin of [true, false]) {
    const r = await get('/api/programs', admin); assert.equal(r.status, 200); privateCache(r);
    assert.deepEqual(await r.json(), admin ? [program, hidden] : [program]);
    check('Liste publique/admin et cache privé : ' + admin);
  }
  for (const [id, admin, expected] of [['probe-id', false, program], ['probe-hidden', true, hidden]]) {
    const r = await get('/api/programs/' + id, admin); assert.equal(r.status, 200); privateCache(r);
    assert.deepEqual(await r.json(), expected); check('Détail et contenu conservé : ' + id);
  }
  for (const route of ['/api/programs/probe-hidden', '/api/programs/absent', '/programmes/probe-hidden', '/programmes/absent', '/programmes/probe-hidden/lots/A1', '/programmes/probe-public/lots/999']) {
    const r = await get(route); assert.equal(r.status, 404);
    if (route.startsWith('/api/')) privateCache(r);
    check('Vrai 404 : ' + route);
  }
  for (const route of ['/programmes/probe-hidden', '/programmes/probe-hidden/lots/A1']) assert.equal((await get(route, true)).status, 404);
  check('La session admin ne révèle pas une page masquée dans la vitrine');
  for (const title of ['Programme fictif initial', 'Programme fictif modifié']) {
    await save([{ ...program, title }, hidden]);
    for (const route of ['/programmes/probe-public', '/programmes/probe-public/lots/A1']) {
      const r = await get(route); assert.equal(r.status, 200); const body = await r.text(); const $ = load(body);
      assert.ok($('title').text().includes(title)); assert.ok($('meta[name="description"]').attr('content'));
      assert.ok(body.includes(title)); assert.doesNotMatch(body, /PROGRAMME_MASQUE_FICTIF/);
      check('Titre et corps frais : ' + title + ' ' + route);
    }
  }
  for (const route of ['/programmes/probe-id', '/programmes/probe-id/lots/A1']) {
    const r = await get(route); assert.equal(r.status, 200); check('Ancien lien par identifiant conservé : ' + route);
  }
  const ordinal = await get('/programmes/probe-public/lots/2'); assert.equal(ordinal.status, 200);
  assert.match(load(await ordinal.text())('h1').text(), /Lot 2/); check('Numéro ordinal historique conservé');
  await save([{ ...program, visible: false }, hidden]);
  assert.deepEqual(await (await get('/api/programs')).json(), []);
  for (const route of ['/api/programs/probe-id', '/programmes/probe-public', '/programmes/probe-public/lots/A1']) assert.equal((await get(route)).status, 404);
  check('Masquage immédiat dans API, page et lot');
  const routes = ['/api/programs', '/api/programs/probe-id', '/programmes/probe-public', '/programmes/probe-public/lots/A1'];
  for (const broken of ['{corrompu', '{}']) {
    await fs.writeFile(file, broken);
    for (const route of routes) { assert.equal((await get(route)).status, 500); check('Panne explicite sans faux 404 : ' + broken + ' ' + route); }
  }
  await save([program]); await fs.rename(file, file + '.fictif-backup');
  for (const route of routes) { assert.equal((await get(route)).status, 500); check('Collection absente : ' + route); }
  await fs.rename(file + '.fictif-backup', file);
  for (const route of routes) assert.equal((await get(route)).status, 200);
  check('Récupération sans redémarrage après restauration fictive');
  console.log(JSON.stringify({ checks, isolated: true, directory: dir }));
} catch (error) { console.error(serverLog.slice(-4000)); throw error; }
finally { if (child && child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); } }
