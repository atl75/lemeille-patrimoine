import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createArticleReader, publicArticles, toPublicArticle } from '../lib/articlesData.ts';

const article = { id: 'test', slug: 'fictif', title: 'Fictif', excerpt: 'Extrait', content: 'Contenu', publishedAt: '2026-09-11', published: true };
test('articles : champs internes exclus, champs publics et texte préservés', () => {
  assert.deepEqual(toPublicArticle({ ...article, internalNote: 'privé', customerEmail: 'fictif@example.test' }), article);
});
test('articles : brouillons absents, compatibilité des anciens articles sans indicateur', () => {
  const { published, ...legacy } = article;
  assert.deepEqual(publicArticles([article, { ...article, published: false }, legacy, null]), [article, legacy]);
});
test('articles : collection malformée refusée, jamais une liste vide silencieuse', () => {
  for (const value of [null, {}, 'erreur']) assert.throws(() => publicArticles(value), /Collection articles invalide/);
  assert.deepEqual(publicArticles([]), []);
});
test('articles : lecteur direct frais, sans mémorisation entre requêtes', async () => {
  let calls = 0;
  const reader = createArticleReader(async (file, options) => {
    assert.equal(file, 'articles.json'); assert.deepEqual(options, { fresh: true }); calls++;
    return [{ ...article, title: String(calls) }];
  });
  assert.equal((await reader.bySlug('fictif'))?.title, '1');
  assert.equal((await reader.bySlug('fictif'))?.title, '2');
  assert.equal(await reader.bySlug('absent'), null);
});
test('articles : panne remontée au lieu de faux 404, récupération possible', async () => {
  let failing = true;
  const reader = createArticleReader(async () => { if (failing) throw new Error('Stockage indisponible'); return [article]; });
  await assert.rejects(reader.bySlug('fictif'), /Stockage indisponible/);
  failing = false;
  assert.deepEqual(await reader.bySlug('fictif'), article);
});
test('articles : masquage pris en compte à la lecture suivante', async () => {
  let published = true;
  const reader = createArticleReader(async () => [{ ...article, published }]);
  assert.ok(await reader.bySlug('fictif'));
  published = false;
  assert.equal(await reader.bySlug('fictif'), null);
});
