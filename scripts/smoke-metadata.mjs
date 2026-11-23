#!/usr/bin/env node
/** Lecture seule sur une COPIE LOCALE préparée avec scripts/fixtures/metadata.mjs. */
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { articles } from './fixtures/metadata.mjs';
import { SECTORS } from '../lib/sectors.ts';

const origin = new URL(process.argv[2] || 'http://127.0.0.1:3310');
assert.ok(origin.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname), 'Recette réservée à un serveur local isolé');
const base = origin.origin;
const get = path => fetch(base + path, { redirect: 'manual', headers: { 'User-Agent': 'Googlebot' }, signal: AbortSignal.timeout(30_000) });
const fixture = await (await get('/api/articles')).json();
assert.deepEqual(fixture.map(a => a.id).sort(), ['seo-a', 'seo-b', 'seo-c'], 'Collections fictives requises ; arrêter plutôt que tester des données métier');
let count = 0;
const staticPaths = ['/', '/vendre', '/immobilier/estimation', '/actualites', '/contact', '/immobilier', '/programmes', '/qui-suis-je', '/references', '/faq', '/financement', '/partenaires', '/cookies', '/confidentialite', '/mentions-legales', '/bareme-honoraires', '/avis'];
const dynamicPaths = [...Object.keys(SECTORS).map(s => '/secteurs/' + s), '/immobilier/biens/seo-bien', '/immobilier/biens/seo-vendu', '/programmes/seo-programme', '/programmes/seo-programme/lots/1', ...articles.filter(a => a.published).map(a => '/actualites/' + a.slug)];
const rendered = new Map();
for (const path of [...staticPaths, ...dynamicPaths]) {
  const response = await get(path);
  assert.equal(response.status, 200, path);
  const $ = load(await response.text());
  const one = selector => { assert.equal($(selector).length, 1, path + ': ' + selector); return $(selector); };
  const title = one('title').text();
  const description = one('meta[name="description"]').attr('content');
  assert.ok(title && description, path + ': textes requis');
  one('h1');
  assert.equal(new URL(one('link[rel="canonical"]').attr('href')).href, base + path, path + ': canonical');
  assert.equal(new URL(one('meta[property="og:url"]').attr('content')).href, base + path, path + ': OG URL');
  for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) assert.equal(one(selector).attr('content'), title, path + ': titre social');
  for (const selector of ['meta[property="og:description"]', 'meta[name="twitter:description"]']) assert.equal(one(selector).attr('content'), description, path + ': description sociale');
  for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) assert.ok(one(selector).attr('content')?.startsWith(base + '/'), path + ': image locale ou repli');
  assert.equal($('#seo-injection').length, 0, 'Pas de sortie HTML depuis une métadonnée');
  for (const el of $('script[type="application/ld+json"]').toArray()) JSON.parse($(el).text());
  if (path === '/avis' || path.endsWith('/seo-vendu')) assert.match($('meta[name="robots"]').attr('content') || '', /noindex/);
  else assert.doesNotMatch($('meta[name="robots"]').attr('content') || '', /noindex/);
  rendered.set(path, $);
  console.log('✓ Métadonnées complètes : ' + path); count++;
}
for (const article of articles.filter(a => a.published)) {
  const $ = rendered.get('/actualites/' + article.slug);
  assert.equal($('title').text(), article.seoTitle.trim() || article.title);
  assert.equal($('meta[name="description"]').attr('content'), (article.seoDescription?.trim() || article.excerpt).replace(/\s+/g, ' ').trim());
  assert.equal($('meta[property="og:type"]').attr('content'), 'article');
  const image = base + (article.coverImage || '/og-image.jpg?v=5');
  assert.equal($('meta[property="og:image"]').attr('content'), image);
  console.log('✓ Texte complet / image : ' + article.slug); count++;
}
const missing = ['/actualites/inexistant-seo', '/actualites/seo-fictif-masque', '/secteurs/inexistant-seo', '/immobilier/biens/inexistant-seo', '/immobilier/biens/seo-bien-masque', '/programmes/inexistant-seo', '/programmes/seo-programme-masque', '/programmes/seo-programme/lots/999', '/programmes/seo-programme-masque/lots/1'];
{
  const $ = rendered.get('/actualites/seo-fictif-texte');
  const body = $('.card.leading-relaxed');
  assert.equal(body.find('a[href="/immobilier/estimation"]').text(), 'Estimer mon bien');
  assert.equal(body.find('li strong a').attr('href'), 'https://www.service-public.fr/particuliers/vosdroits/F32061');
  assert.equal(body.find('a').filter((_, e) => $(e).text() === 'Parenthèses').attr('href'), 'https://example.org/a_(b)');
  console.log('✓ Liens dans les paragraphes et listes en gras'); count++;
  assert.equal(body.find('h2 strong').text(), 'méthode');
  assert.equal(body.find('h3').text(), 'Pour aller plus loin');
  assert.equal(body.find('ul li').length, 1);
  console.log('✓ Structure éditoriale conservée'); count++;
  assert.equal(body.find('script, img, a[href^="javascript:"]').length, 0);
  assert.match(body.text(), /\[Piège\]\(javascript:alert\(1\)\)/);
  assert.match(body.text(), /<img id="article-injection"/);
  assert.equal($('#article-injection, #article-script').length, 0);
  console.log('✓ HTML brut et lien dangereux non exécutables'); count++;
}
for (const path of missing) {
  const r = await get(path); assert.equal(r.status, 404, path);
  const $ = load(await r.text()); assert.match($('meta[name="robots"]').map((_, e) => $(e).attr('content')).get().join(','), /noindex/, path);
  console.log('✓ Introuvable / masqué : ' + path); count++;
}
console.log(`${count} contrôles SEO locaux réussis. Aucun envoi ni accès à la production.`);
