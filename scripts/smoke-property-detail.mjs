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
const dir = await fs.mkdtemp(path.join(tmpdir(), 'lp-property-detail-smoke-'));
const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
const base = `http://127.0.0.1:${port}`;
const secret = 'fictif-local-property-only'; const expiry = String(Date.now() + 600_000);
const cookie = `lp_admin=${expiry}.${createHmac('sha256', secret).update(expiry).digest('hex')}`;
const property = { id: 'probe-public', title: 'Bien fictif initial', visible: true, city: 'Rouen', type: 'APPARTEMENT',
  surface: 40, rooms: 2, price: 100000, description: 'Description fictive, aucune donnée réelle.', images: [], features: [],
  owners: ['MARQUEUR_PRIVE'], titleDeed: '/MARQUEUR_PRIVE.pdf', internalFutureField: 'MARQUEUR_PRIVE',
  map: { precision: 'AREA', query: 'ADRESSE_PRIVEE', zoom: 12 } };
const hidden = { ...property, id: 'probe-hidden', visible: false };
const file = path.join(dir, 'data/properties.json');
const save = data => fs.writeFile(file, JSON.stringify(data));
const get = (route, admin = false) => fetch(base + route, { headers: { 'User-Agent': 'Googlebot', ...(admin ? { Cookie: cookie } : {}) }, redirect: 'manual', signal: AbortSignal.timeout(30000) });
const privateCache = r => { assert.match(r.headers.get('cache-control'), /private, no-store/); assert.match(r.headers.get('vary'), /Cookie/); };
let child; let serverLog = ''; let checks = 0;
const check = label => { checks++; console.log('✓ ' + label); };
try {
  execFileSync('rsync', ['-a', '--exclude=.git', '--exclude=node_modules', '--exclude=.env*', '--exclude=data', '--exclude=public/uploads', '--exclude=.next/cache', '--exclude=.next/standalone', root, dir + '/']);
  await fs.symlink(path.join(root, 'node_modules'), path.join(dir, 'node_modules'));
  await fs.mkdir(path.join(dir, 'data'), { recursive: true });
  for (const name of ['articles', 'programs', 'reviews', 'leads', 'mandats', 'subscribers', 'custom-features']) await fs.writeFile(path.join(dir, 'data', name + '.json'), '[]');
  await save([property, hidden]);
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
  const admin = await get('/api/properties/probe-public', true); assert.equal(admin.status, 200); privateCache(admin);
  assert.match(await admin.text(), /MARQUEUR_PRIVE/); check('API admin complète et non partageable en cache');
  const publicResponse = await get('/api/properties/probe-public'); assert.equal(publicResponse.status, 200); privateCache(publicResponse);
  const text = await publicResponse.text(); assert.doesNotMatch(text, /MARQUEUR_PRIVE|ADRESSE_PRIVEE/);
  assert.equal(JSON.parse(text).map.query, 'Rouen'); check('Lecture anonyme après admin : projection sûre et adresse réduite à la ville');
  const hiddenAdmin = await get('/api/properties/probe-hidden', true); assert.equal(hiddenAdmin.status, 200); privateCache(hiddenAdmin);
  check('Bien masqué accessible dans l’API admin uniquement');
  for (const route of ['/api/properties/probe-hidden', '/api/properties/absent', '/immobilier/biens/probe-hidden', '/immobilier/biens/absent']) {
    const r = await get(route); assert.equal(r.status, 404);
    if (route.startsWith('/api/')) privateCache(r);
    check('Vrai 404 sans donnée privée : ' + route);
  }
  assert.equal((await get('/immobilier/biens/probe-hidden', true)).status, 404);
  check('Une session admin ne publie pas un bien masqué dans la vitrine');
  const pageAdmin = await get('/immobilier/biens/probe-public', true); assert.equal(pageAdmin.status, 200);
  assert.doesNotMatch(await pageAdmin.text(), /MARQUEUR_PRIVE|ADRESSE_PRIVEE/);
  check('La page publique reste projetée même avec une session admin');
  for (const [title, price] of [['Bien fictif initial', 100000], ['Bien fictif modifié', 110000]]) {
    await save([{ ...property, title, price }, hidden]);
    const r = await get('/immobilier/biens/probe-public'); assert.equal(r.status, 200);
    const body = await r.text(); const $ = load(body);
    assert.equal($('h1').text(), title); assert.ok($('title').text().includes(title));
    assert.ok($('meta[name="description"]').attr('content').replace(/[\s\u202f\u00a0]/g, '').includes(String(price)));
    assert.doesNotMatch(body, /MARQUEUR_PRIVE|ADRESSE_PRIVEE/);
    check('Métadonnées et corps frais sans reconstruction : ' + title);
  }
  await save([{ ...property, visible: false }, hidden]);
  assert.equal((await get('/immobilier/biens/probe-public')).status, 404);
  assert.equal((await get('/api/properties/probe-public')).status, 404);
  check('Masquage effectif dès la lecture suivante');
  for (const broken of ['{corrompu', '{}']) {
    await fs.writeFile(file, broken);
    for (const route of ['/api/properties/probe-public', '/immobilier/biens/probe-public']) {
      assert.equal((await get(route)).status, 500); check('Erreur de stockage explicite, pas faux 404 : ' + broken + ' ' + route);
    }
  }
  await save([property]); await fs.rename(file, file + '.fictif-backup');
  for (const route of ['/api/properties/probe-public', '/immobilier/biens/probe-public']) {
    assert.equal((await get(route)).status, 500); check('Collection absente : erreur explicite ' + route);
  }
  await fs.rename(file + '.fictif-backup', file);
  assert.equal((await get('/immobilier/biens/probe-public')).status, 200);
  check('Récupération sans redémarrage après restauration fictive');
  await save([{ ...property, map: { ...property.map, precision: 'EXACT', query: 'ADRESSE_PUBLIQUE' } }]);
  const exact = await get('/api/properties/probe-public'); assert.equal(exact.status, 200);
  assert.equal((await exact.json()).map.query, 'ADRESSE_PUBLIQUE');
  assert.match(await (await get('/immobilier/biens/probe-public')).text(), /ADRESSE_PUBLIQUE/);
  check('Adresse précise conservée quand sa publication est explicite');
  console.log(JSON.stringify({ checks, isolated: true, directory: dir }));
} catch (error) { console.error(serverLog.slice(-4000)); throw error; }
finally { if (child && child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); } }
