import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArticleInline, safeArticleHref } from '../lib/articleInline.ts';

test('articles : conserve texte, accents, ponctuation et gras historique', () => {
  assert.deepEqual(parseArticleInline('Avant **après visite** — fin.'), [{ type: 'text', value: 'Avant ' }, { type: 'strong', children: [{ type: 'text', value: 'après visite' }] }, { type: 'text', value: ' — fin.' }]);
});
test('articles : liens internes, ancres et sources HTTPS', () => {
  for (const href of ['/immobilier/estimation', '/vendre?origine=article#estimation', '#source', 'https://bofip.impots.gouv.fr/bofip/4142-PGP.html']) {
    assert.deepEqual(parseArticleInline(`[Source](${href})`), [{ type: 'link', href, children: [{ type: 'text', value: 'Source' }] }]);
  }
});
test('articles : parenthèses équilibrées et échappées dans une URL', () => {
  assert.equal(parseArticleInline('[Source](https://example.com/a_(b))')[0].type, 'link');
  assert.deepEqual(parseArticleInline('[Source](https://example.com/a_\\(b\\))'), parseArticleInline('[Source](https://example.com/a_(b))'));
});
test('articles : gras dans un libellé et lien dans du gras', () => {
  assert.deepEqual(parseArticleInline('[**Source**](/vendre)'), [{ type: 'link', href: '/vendre', children: [{ type: 'strong', children: [{ type: 'text', value: 'Source' }] }] }]);
  assert.deepEqual(parseArticleInline('**[Source](/vendre)**'), [{ type: 'strong', children: [{ type: 'link', href: '/vendre', children: [{ type: 'text', value: 'Source' }] }] }]);
});
test('articles : protocoles dangereux, URL ambiguës et identifiants refusés', () => {
  for (const href of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,test', 'vbscript:test', 'file:///etc/passwd', '//example.com', '/\\example.com', 'https://u:p@example.com', 'https://example.com/\n', 'java&#115;cript:alert(1)', '&#106;avascript:test', ' https://example.com', 'https://', '#', 'mailto:a@example.com', '/test" onclick="test']) assert.equal(safeArticleHref(href), null, href);
});
test('articles : un lien refusé reste lisible, sans nœud de lien', () => {
  const value = '[Source](javascript:alert(1))';
  assert.deepEqual(parseArticleInline(value), [{ type: 'text', value }]);
});
test('articles : HTML brut et images Markdown restent du texte', () => {
  for (const value of ['<img src=x onerror=alert(1)>', '<script>alert(1)</script>', '![Photo](https://example.com/photo.jpg)']) assert.deepEqual(parseArticleInline(value), [{ type: 'text', value }]);
});
test('articles : syntaxe incomplète et libellés vides inchangés', () => {
  for (const value of ['[Source](', '[Source](/vendre', '[](/vendre)', '[   ](/vendre)', '**inachevé', 'texte sans lien']) assert.deepEqual(parseArticleInline(value), [{ type: 'text', value }]);
});
test('articles : plusieurs liens, query string et caractères échappés', () => {
  const links = parseArticleInline('[A](/vendre) et [B](https://example.com/?a=1&b=2)').filter(n => n.type === 'link');
  assert.equal(links.length, 2);
  assert.deepEqual(parseArticleInline('\\[texte\\] \\*sans gras\\*'), [{ type: 'text', value: '[texte] *sans gras*' }]);
});
test('articles : bornes des liens et libellés malformés', () => {
  assert.equal(parseArticleInline('[' + 'a'.repeat(310) + '](/vendre)').some(n => n.type === 'link'), false);
  assert.equal(parseArticleInline('[A](https://example.com/' + 'a'.repeat(2100) + ')').some(n => n.type === 'link'), false);
  assert.deepEqual(parseArticleInline('['.repeat(10000)), [{ type: 'text', value: '['.repeat(10000) }]);
});
