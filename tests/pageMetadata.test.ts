import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { seoTitle } from '../lib/seoTitle.ts';
import { pageMetadata, seoText } from '../lib/pageMetadata.ts';
import { OG_IMAGE } from '../lib/ogImage.ts';

test('titre SEO : conserve un titre long en entier, sans ellipse ajoutée', () => {
  const title = 'Marché immobilier à Rouen en 2026 : tendances et prix au mètre carré par quartier';
  assert.equal(seoTitle([title]), title);
});

test('titre SEO : deux sujets différant après le budget restent distincts', () => {
  const prefix = 'Comment préparer la vente de votre maison de caractère située dans le quartier ';
  assert.notEqual(seoTitle([prefix + 'Pasteur']), seoTitle([prefix + 'Saint-Marc']));
});

test('titre SEO : suffixes facultatifs supprimés, titre court et marque préservés', () => {
  assert.equal(seoTitle(['Estimation à Rouen', 'Un complément régional très long']), 'Estimation à Rouen | Lemeille Patrimoine');
  assert.equal(seoTitle(['Rouen', 'Centre']), 'Rouen · Centre | Lemeille Patrimoine');
  assert.equal(seoTitle(['Rouen', 'Centre'], ' — '), 'Rouen — Centre | Lemeille Patrimoine');
});

test('titre SEO : marque non dupliquée et repli des champs vides', () => {
  assert.equal(seoTitle(['Rouen | Lemeille Patrimoine']), 'Rouen | Lemeille Patrimoine');
  assert.equal(seoTitle([null, '', undefined, '  ']), 'Lemeille Patrimoine');
  assert.equal(seoTitle(['  Estimation\nà Rouen  ']), 'Estimation à Rouen | Lemeille Patrimoine');
});

test('texte SEO : conserve une phrase complète dépassant 160 caractères', () => {
  const description = 'Une description éditoriale complète qui précise le contexte de la vente, la méthode de travail et les étapes du rendez-vous, sans couper le dernier mot ni retirer la condition après la visite.';
  assert.ok(description.length > 160);
  assert.equal(seoText(description), description);
});

test('texte SEO : ignore les valeurs vides ou invalides, normalise les espaces', () => {
  assert.equal(seoText(undefined, null, {}, 123, ' \n ', '  Avis\n de\tvaleur\u00a0après visite.  '), 'Avis de valeur après visite.');
  assert.equal(seoText('', null), '');
});

const base = { title: 'Estimation à Rouen', description: 'Avis après visite.', alternates: { canonical: '/immobilier/estimation' } };

test('métadonnées : canonique, OG et Twitter propres à la page avec image de repli', () => {
  const result = pageMetadata(base);
  assert.equal(result.openGraph?.url, base.alternates.canonical);
  assert.equal(result.openGraph?.title, base.title);
  assert.equal(result.twitter?.title, base.title);
  assert.equal(result.openGraph?.description, base.description);
  assert.equal(result.twitter?.description, base.description);
  assert.deepEqual(result.openGraph?.images, OG_IMAGE);
  assert.deepEqual(result.twitter?.images, OG_IMAGE);
});

test('métadonnées : images propres, type article et champs spécifiques préservés', () => {
  const result = pageMetadata({ ...base, openGraph: { type: 'article', publishedTime: '2026-09-11', images: [{ url: '/couverture.jpg', alt: 'Couverture' }] } });
  assert.ok(result.openGraph && 'type' in result.openGraph && result.openGraph.type === 'article');
  assert.equal(result.openGraph.publishedTime, '2026-09-11');
  assert.deepEqual(result.twitter?.images, [{ url: '/couverture.jpg', alt: 'Couverture' }]);
});

test('métadonnées : remplace les anciens textes et URL sociaux par ceux de la page', () => {
  const result = pageMetadata({ ...base, openGraph: { url: '/', title: 'Accueil', description: 'Ancien texte' }, twitter: { card: 'summary_large_image', title: 'Accueil', images: ['/twitter-propre.jpg'] } });
  assert.equal(result.openGraph?.url, base.alternates.canonical);
  assert.equal(result.openGraph?.title, base.title);
  assert.equal(result.twitter?.description, base.description);
  assert.deepEqual(result.twitter?.images, ['/twitter-propre.jpg']);
});

test('métadonnées : conserve noindex, langues et autres attributs sans mutation', () => {
  const input = { ...base, robots: { index: false, follow: true }, alternates: { ...base.alternates, languages: { fr: '/immobilier/estimation' } } };
  const before = structuredClone(input);
  const result = pageMetadata(input);
  assert.deepEqual(result.robots, input.robots);
  assert.deepEqual(result.alternates, input.alternates);
  assert.deepEqual(input, before);
});

test('métadonnées : entrée incomplète ou canonique externe refusée', () => {
  for (const canonical of ['', 'https://example.com', '//example.com']) {
    assert.throws(() => pageMetadata({ ...base, alternates: { canonical } }));
  }
  assert.throws(() => pageMetadata({ ...base, title: ' ' }));
  assert.throws(() => pageMetadata({ ...base, description: ' ' }));
  assert.equal(pageMetadata({ ...base, alternates: { canonical: '/' } }).openGraph?.url, '/');
});

test('métadonnées : tous les modèles publics traités utilisent le constructeur', () => {
  const files = ['app/page.tsx', 'app/vendre/page.tsx', 'app/immobilier/estimation/page.tsx', 'app/actualites/page.tsx', 'app/contact/layout.tsx', 'app/immobilier/(liste)/page.tsx', 'app/programmes/(liste)/page.tsx', 'app/qui-suis-je/page.tsx', 'app/references/page.tsx', 'app/faq/page.tsx', 'app/financement/page.tsx', 'app/partenaires/page.tsx', 'app/cookies/page.tsx', 'app/confidentialite/page.tsx', 'app/mentions-legales/page.tsx', 'app/bareme-honoraires/page.tsx', 'app/avis/page.tsx', 'app/actualites/[slug]/page.tsx', 'app/secteurs/[slug]/page.tsx', 'app/programmes/[slug]/page.tsx', 'app/programmes/[slug]/lots/[numero]/page.tsx', 'app/immobilier/biens/[id]/page.tsx'];
  for (const file of files) assert.match(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), /pageMetadata\(\{/u, file);
  for (const file of ['app/actualites/[slug]/page.tsx', 'app/secteurs/[slug]/page.tsx']) {
    assert.doesNotMatch(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), /\.slice\(0, 1[56]\d\)/u, file);
  }
});
