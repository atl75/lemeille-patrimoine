#!/usr/bin/env node
/** Recette mutante exclusivement dans une copie temporaire avec articles fictifs. */
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
import { sitemapSectorSlugs } from '../lib/sitemapData.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
await fs.access(path.join(root, '.next/BUILD_ID'));
const dir = await fs.mkdtemp(path.join(tmpdir(), 'lp-articles-smoke-'));
const socket = createServer();
socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const base = `http://127.0.0.1:${port}`;
const secret = 'fictif-local-articles-only';
const expiry = String(Date.now() + 600_000);
const cookie = `lp_admin=${expiry}.${createHmac('sha256', secret).update(expiry).digest('hex')}`;
const article = { id: 'probe-public', slug: 'probe-public', title: 'Article fictif initial', excerpt: 'Extrait fictif', content: '## Méthode\n[Estimation](/immobilier/estimation)', tags: [], publishedAt: '2026-09-11', published: true, internalNote: 'MARQUEUR_INTERNE_FICTIF' };
const hidden = { ...article, id: 'probe-hidden', slug: 'probe-hidden', title: 'Brouillon fictif', published: false };
let child;
let serverLog = '';
let checks = 0;
const save = articles => fs.writeFile(path.join(dir, 'data/articles.json'), JSON.stringify(articles));
const get = (route, admin = false) => fetch(base + route, { headers: { 'User-Agent': 'Googlebot', ...(admin ? { Cookie: cookie } : {}) }, signal: AbortSignal.timeout(30000), redirect: 'manual' });
const check = label => { checks++; console.log('✓ ' + label); };
try {
  execFileSync('rsync', ['-a', '--exclude=.git', '--exclude=node_modules', '--exclude=.env*', '--exclude=data', '--exclude=public/uploads', '--exclude=.next/cache', '--exclude=.next/standalone', root, dir + '/']);
  await fs.symlink(path.join(root, 'node_modules'), path.join(dir, 'node_modules'));
  await fs.mkdir(path.join(dir, 'data'), { recursive: true });
  for (const file of ['properties', 'programs', 'reviews', 'leads', 'mandats', 'subscribers', 'custom-features']) await fs.writeFile(path.join(dir, 'data', file + '.json'), '[]');
  await save([article, hidden]);
  child = spawn(process.execPath, [path.join(dir, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: dir, env: { PATH: process.env.PATH, NODE_ENV: 'production', LP_SANS_GCS: '1', SESSION_SECRET: secret, RESEND_API_KEY: '', ANTHROPIC_API_KEY: '', NEXT_PUBLIC_SITE_URL: base, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', b => { serverLog += b; }); child.stderr.on('data', b => { serverLog += b; });
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error('Serveur arrêté');
    try { if ((await get('/api/health')).ok) break; } catch { /* démarrage */ }
    if (i === 99) throw new Error('Démarrage trop long');
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  for (const route of ['/api/articles', '/api/articles/probe-public']) {
    const r = await get(route); assert.equal(r.status, 200); const text = await r.text();
    assert.ok(!text.includes('MARQUEUR_INTERNE_FICTIF') && !text.includes('probe-hidden'));
    assert.match(r.headers.get('cache-control'), /private, no-store/); assert.match(r.headers.get('vary'), /Cookie/);
    const admin = await get(route, true); assert.equal(admin.status, 200); assert.match(await admin.text(), /MARQUEUR_INTERNE_FICTIF/);
    assert.match(admin.headers.get('cache-control'), /private, no-store/);
    check('Projection publique / accès admin sans cache partagé : ' + route);
  }
  for (const route of ['/api/articles/probe-hidden', '/actualites/probe-hidden', '/actualites/absent']) {
    assert.equal((await get(route)).status, 404); check('Brouillon / absent : ' + route);
  }
  for (const title of ['Article fictif initial', 'Article fictif modifié']) {
    await save([{ ...article, title }, hidden]);
    const r = await get('/actualites/probe-public'); assert.equal(r.status, 200); const text = await r.text(); const $ = load(text);
    assert.equal($('h1').text(), title); assert.ok($('title').text().startsWith(title));
    assert.equal($('meta[property="og:title"]').attr('content'), $('title').text());
    assert.equal($('.card.leading-relaxed a').attr('href'), '/immobilier/estimation');
    assert.ok(!text.includes('MARQUEUR_INTERNE_FICTIF'));
    const listing = await get('/actualites'); assert.equal(listing.status, 200); assert.ok((await listing.text()).includes(title));
    check('Corps / métadonnées / liste à jour sans reconstruction : ' + title);
  }
  await save([{ ...article, published: false }, hidden]);
  assert.equal((await get('/actualites/probe-public')).status, 404);
  assert.equal((await get('/api/articles/probe-public')).status, 404);
  assert.deepEqual(await (await get('/api/articles')).json(), []);
  assert.ok(!(await (await get('/actualites')).text()).includes('Article fictif initial'));
  check('Masquage visible dès la requête suivante');
  await save([article, hidden, { ...article, id: 'date', slug: 'date', publishedAt: '2026-02-30' }, { ...article, id: 'iso', slug: 'iso', publishedAt: '2026-08-28T09:47:13.200Z' }]);
  const sitemapResponse = await get('/sitemap.xml'); assert.equal(sitemapResponse.status, 200);
  const xml = load(await sitemapResponse.text(), { xmlMode: true });
  const urls = xml('url').toArray();
  const sectors = urls.map(el => xml(el).find('loc').text()).filter(url => url.includes('/secteurs/')).map(url => url.split('/').pop()).sort();
  assert.deepEqual(sectors, sitemapSectorSlugs().sort());
  assert.ok(!xml.text().includes('probe-hidden'));
  const invalid = urls.find(el => xml(el).find('loc').text().endsWith('/actualites/date'));
  assert.ok(invalid); assert.equal(xml(invalid).find('lastmod').length, 0);
  const valid = urls.find(el => xml(el).find('loc').text().endsWith('/actualites/probe-public'));
  assert.equal(xml(valid).find('lastmod').text(), '2026-09-11T00:00:00.000Z');
  const iso = urls.find(el => xml(el).find('loc').text().endsWith('/actualites/iso'));
  assert.equal(xml(iso).find('lastmod').text(), '2026-08-28T09:47:13.200Z');
  check('Sitemap : secteurs identiques, brouillons exclus, date invalide omise');
  await fs.writeFile(path.join(dir, 'data/articles.json'), '{corrompu');
  for (const route of ['/api/articles', '/actualites', '/actualites/probe-public', '/sitemap.xml']) {
    const r = await get(route); assert.equal(r.status, 500); check('Panne explicite, pas faux vide / 404 : ' + route);
  }
  await save([article]);
  assert.equal((await get('/actualites/probe-public')).status, 200);
  check('Récupération après panne sans redémarrage');
  console.log(JSON.stringify({ checks, isolated: true, directory: dir }));
} catch (error) {
  console.error(serverLog.slice(-4000)); throw error;
} finally {
  if (child && child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
}
