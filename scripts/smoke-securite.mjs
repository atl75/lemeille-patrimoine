#!/usr/bin/env node
/** Après npm run build : tests HTTP sur une COPIE, sans .env ni données métier. */
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
import publicManifest from '../lib/publicManifest.ts';
import terrainManifest from '../lib/terrainManifest.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
await fs.access(path.join(root, '.next/BUILD_ID'));
const dir = await fs.mkdtemp(path.join(tmpdir(), 'lp-security-smoke-'));
const server = createServer();
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
const base = `http://127.0.0.1:${port}`;
const secret = 'fictif-local-security-smoke-only';
let child;
let serverLog = '';
let checks = 0;
const fixture = (file, value) => fs.writeFile(path.join(dir, 'data', file), JSON.stringify(value));
const read = async file => JSON.parse(await fs.readFile(path.join(dir, 'data', file), 'utf8'));
const expiry = String(Date.now() + 600_000);
const cookie = `lp_admin=${expiry}.${createHmac('sha256', secret).update(expiry).digest('hex')}`;
async function request(url, method = 'GET', body, admin = false) {
  return fetch(base + url, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(admin ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'manual', signal: AbortSignal.timeout(30_000) });
}
async function status(response, expected, label) {
  assert.equal(response.status, expected, `${label}: ${await response.clone().text()}`);
  checks++; console.log(`✓ ${label}`);
}
try {
  execFileSync('rsync', ['-a', '--exclude=.git', '--exclude=node_modules', '--exclude=.env*', '--exclude=data', '--exclude=public/uploads', '--exclude=.next/cache', '--exclude=.next/standalone', root, dir + '/']);
  await fs.symlink(path.join(root, 'node_modules'), path.join(dir, 'node_modules'));
  await fs.mkdir(path.join(dir, 'data', 'uploads'), { recursive: true });
  for (const file of ['properties.json', 'programs.json', 'reviews.json', 'articles.json', 'mandats.json', 'subscribers.json', 'custom-features.json']) await fixture(file, []);
  for (const name of ['public.pdf', 'private.pdf', 'unknown.pdf', 'commercial.pdf']) await fs.writeFile(path.join(dir, 'data', 'uploads', name), '%PDF-1.4\nDocument fictif de test\n%%EOF');
  await fixture('properties.json', [{ id: 'visible', visible: true, floorPlans: ['/api/document/public.pdf'], agMinutes: ['/api/document/private.pdf'] }]);
  await fixture('programs.json', [{ id: 'programme', visible: true, lots: [{ plan: '/api/document/commercial.pdf' }] }]);
  // Environnement volontairement minimal : aucun secret hérité du projet.
  child = spawn(process.execPath, [path.join(dir, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: dir, env: { PATH: process.env.PATH, NODE_ENV: 'production', LP_SANS_GCS: '1', SESSION_SECRET: secret, RESEND_API_KEY: '', ANTHROPIC_API_KEY: '', NEXT_PUBLIC_SITE_URL: base, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', chunk => { serverLog += chunk; }); child.stderr.on('data', chunk => { serverLog += chunk; });
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error('Serveur de test arrêté');
    try { if ((await request('/api/health')).ok) break; } catch { /* démarrage */ }
    if (i === 99) throw new Error('Démarrage trop long');
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  await status(await request('/api/document/public.pdf'), 200, 'plan public accessible');
  await status(await request('/api/document/commercial.pdf'), 200, 'plan du programme accessible');
  for (const name of ['private.pdf', 'unknown.pdf']) {
    const response = await request(`/api/document/${name}`);
    await status(response, 404, `${name} refusé sans session`);
    assert.match(response.headers.get('cache-control'), /no-store/);
  }
  const privateResponse = await request('/api/document/private.pdf', 'GET', undefined, true);
  await status(privateResponse, 200, 'document privé accessible à l’admin');
  assert.match(privateResponse.headers.get('cache-control'), /private, no-store/);
  assert.equal(privateResponse.headers.get('x-content-type-options'), 'nosniff');
  assert.match(privateResponse.headers.get('vary'), /Cookie/);
  await fixture('properties.json', [{ visible: false, floorPlan: '/api/document/public.pdf' }]);
  await status(await request('/api/document/public.pdf'), 404, 'bien masqué : accès retiré');
  await fixture('properties.json', [{ floorPlan: '/api/document/public.pdf' }, { agMinutes: ['/api/document/public.pdf'] }]);
  await status(await request('/api/document/public.pdf'), 404, 'référence privée prioritaire');
  await fs.writeFile(path.join(dir, 'data', 'properties.json'), '{corrompu');
  await status(await request('/api/document/public.pdf'), 503, 'stockage illisible : document refusé');
  await fixture('properties.json', []);
  await status(await request('/api/upload-document', 'POST', { file: 'data:application/pdf;base64,eA==' }), 401, 'upload réservé à l’admin');
  const upload = await request('/api/upload-document', 'POST', { file: 'data:application/pdf;base64,JVBERi0xLjQKJSVFT0Y=' }, true);
  await status(upload, 200, 'upload fictif administrateur');
  const uploaded = (await upload.json()).url;
  await status(await request(uploaded), 404, 'nouvel upload non publié par défaut');
  await status(await request(uploaded, 'GET', undefined, true), 200, 'nouvel upload lisible par l’admin');

  // Créations simultanées : les anciens read/push/write perdaient des entrées.
  const property = { title: 'Fictif', type: 'APPARTEMENT', city: 'Rouen', region: 'ROUEN', price: 100000, surface: 40, rooms: 2, description: 'Test sans donnée client', images: [], features: [], map: { precision: 'AREA', query: 'Rouen', zoom: 12 }, dpe: { classEnergy: 'D', classGES: 'D', consumptionKwh: 200, emissionsKg: 30, date: '2026-01-01', ref: 'fictif' }, visible: false };
  const program = { title: 'Fictif', city: 'Rouen', dispositif: 'TEST', summary: 'Fictif', visible: false };
  const review = { author: 'Fictif', rating: 5, source: 'TEST', text: 'Fictif', date: '2026-09-10', published: false };
  for (const [route, file, body] of [['properties', 'properties.json', property], ['programs', 'programs.json', program], ['reviews', 'reviews.json', review], ['mandats', 'mandats.json', { title: 'Fictif' }]]) {
    await fixture(file, []);
    const responses = await Promise.all(Array.from({ length: 12 }, () => request(`/api/${route}`, 'POST', body, true)));
    for (const response of responses) assert.equal(response.status, 200, `${route}: ${await response.text()}`);
    const saved = await read(file);
    assert.equal(saved.length, 12); assert.equal(new Set(saved.map(x => x.id)).size, 12);
    if (route === 'mandats') assert.equal(new Set(saved.map(x => x.mandateNumber)).size, 12);
    checks++; console.log(`✓ 12 créations simultanées ${route} sans perte ni doublon`);
    if (route === 'reviews' || route === 'programs') {
      await status(await request(`/api/${route}/${saved[0].id}`), 404, `${route} non publié inaccessible par ID`);
      const changes = await Promise.all(saved.map(item => request(`/api/${route}/${item.id}`, 'PUT', { ...body, [route === 'reviews' ? 'text' : 'summary']: 'Modifié' }, true)));
      assert.ok(changes.every(r => r.status === 200));
      assert.ok((await read(file)).every(x => (x.text || x.summary) === 'Modifié'));
      const deletions = await Promise.all(saved.map(item => request(`/api/${route}/${item.id}`, 'DELETE', undefined, true)));
      assert.ok(deletions.every(r => r.status === 200)); assert.equal((await read(file)).length, 0);
      checks++; console.log(`✓ modifications et suppressions simultanées ${route}`);
    }
  }
  const article = { slug: 'fictif', title: 'Fictif', excerpt: 'Fictif', content: 'Fictif', tags: [], publishedAt: '2026-09-10', published: false };
  const articles = await Promise.all(Array.from({ length: 12 }, () => request('/api/articles', 'POST', article, true)));
  assert.equal(articles.filter(r => r.status === 200).length, 1);
  assert.equal(articles.filter(r => r.status === 400).length, 11);
  const articleSaved = (await read('articles.json'))[0];
  await status(await request(`/api/articles/${articleSaved.id}`), 404, 'brouillon article privé et slug unique sous concurrence');
  await status(await request(`/api/articles/${articleSaved.id}`, 'PUT', { ...article, title: 'Modifié' }, true), 200, 'modification article atomique');
  await status(await request(`/api/articles/${articleSaved.id}`, 'DELETE', undefined, true), 200, 'suppression article atomique');
  const features = await Promise.all(Array.from({ length: 12 }, (_, i) => request('/api/features', 'POST', { feature: `Fictif ${i % 3}` }, true)));
  assert.ok(features.every(r => r.status === 200)); assert.equal((await read('custom-features.json')).length, 3);
  checks++; console.log('✓ prestations simultanées sans perte ni doublon');
  await fixture('mandats.json', [{ id: 'signed', mandateSignStatus: 'SIGNED' }, { id: 'editable', title: 'Fictif' }]);
  await status(await request('/api/mandats/signed', 'PATCH', { title: 'Interdit' }, true), 409, 'mandat signé non modifiable');
  await status(await request('/api/mandats/signed', 'DELETE', undefined, true), 409, 'mandat signé non supprimable');
  await status(await request('/api/mandats/editable', 'PATCH', { title: 'Modifié' }, true), 200, 'mandat non signé modifiable');
  await status(await request('/api/mandats/editable', 'DELETE', undefined, true), 200, 'mandat non signé supprimable');
  await status(await request('/api/mandats/absent', 'DELETE', undefined, true), 404, 'mandat absent : pas de fausse réussite');
  await fs.writeFile(path.join(dir, 'data', 'reviews.json'), '{corrompu');
  await status(await request('/api/reviews', 'POST', review, true), 500, 'collection corrompue : sauvegarde refusée');
  assert.equal(await fs.readFile(path.join(dir, 'data', 'reviews.json'), 'utf8'), '{corrompu');
  // Suppression simulée uniquement dans la copie fictive : pas de recréation silencieuse.
  for (const [route, body] of [['properties', property], ['programs', program], ['articles', article], ['mandats', { title: 'Fictif' }], ['leads', { firstName: 'Fictif' }]]) {
    const file = route + '.json';
    await fixture(file, [{ ...body, id: 'historique-fictif' }]);
    await fs.unlink(path.join(dir, 'data', file));
    await status(await request('/api/' + route, 'GET', undefined, true), 500, `${route} absent : erreur explicite en lecture`);
    await status(await request('/api/' + route, 'POST', body, true), 500, `${route} absent : création refusée`);
    await assert.rejects(fs.stat(path.join(dir, 'data', file)), { code: 'ENOENT' });
    // La restauration est simulée, jamais appliquée aux données réelles.
    await fixture(file, [{ ...body, id: 'historique-fictif', ...(route === 'articles' ? { slug: 'historique-fictif' } : {}) }]);
    await status(await request('/api/' + route, 'POST', body, true), 200, `${route} restauré : saisie possible sans redémarrage`);
    const restored = await request('/api/' + route, 'GET', undefined, true);
    assert.equal(restored.status, 200);
    const rows = await restored.json();
    assert.equal(rows.length, 2); assert.ok(rows.some(row => row.id === 'historique-fictif'));
    checks++; console.log(`✓ ${route} : historique restauré conservé avec le nouvel élément`);
  }
  const publicResponse = await request('/site.webmanifest');
  await status(publicResponse, 200, 'manifest vitrine accessible sans session');
  assert.match(publicResponse.headers.get('content-type'), /application\/manifest\+json/);
  assert.deepEqual(await publicResponse.json(), publicManifest());
  const legacyResponse = await request('/manifest.webmanifest');
  await status(legacyResponse, 200, 'manifest terrain historique conservé');
  assert.deepEqual(await legacyResponse.json(), terrainManifest());
  for (const route of ['/', '/vendre', '/immobilier/estimation']) {
    const page = await request(route);
    await status(page, 200, `installation vitrine : ${route}`);
    const $ = load(await page.text());
    assert.equal($('link[rel="manifest"]').length, 1);
    assert.equal(new URL($('link[rel="manifest"]').attr('href'), base).pathname, '/site.webmanifest');
  }
  const anonymousTerrain = await request('/terrain');
  await status(anonymousTerrain, 307, 'terrain toujours protégé sans session');
  assert.equal(new URL(anonymousTerrain.headers.get('location'), base).pathname, '/admin/login');
  const privateTerrain = await request('/terrain', 'GET', undefined, true);
  await status(privateTerrain, 200, 'terrain authentifié : manifest historique dédié');
  const $terrain = load(await privateTerrain.text());
  assert.equal($terrain('link[rel="manifest"]').length, 1);
  assert.equal(new URL($terrain('link[rel="manifest"]').attr('href'), base).pathname, '/manifest.webmanifest');
  assert.match($terrain('meta[name="robots"]').attr('content'), /noindex/);
  const icon = await request('/favicon.svg');
  await status(icon, 200, 'icône vectorielle publique disponible');
  assert.match(icon.headers.get('content-type'), /image\/svg\+xml/);
  assert.match(await icon.text(), /viewBox="0 0 64 64"/);
  console.log(`${checks} contrôles HTTP réussis. Données fictives uniquement. Copie : ${dir}`);
} catch (error) {
  console.error(serverLog.slice(-6000));
  throw error;
} finally {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM');
    await once(child, 'exit');
  }
  // Copie conservée pour diagnostic ; aucune suppression de dossier utilisateur.
}
