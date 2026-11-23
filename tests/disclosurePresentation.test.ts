import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const vendre = readFileSync(new URL('../app/vendre/page.tsx', import.meta.url), 'utf8');
const programme = readFileSync(new URL('../app/programmes/[slug]/page.tsx', import.meta.url), 'utf8');

test('matériel photo : disclosure natif fermé, contenu conservé dans le HTML', () => {
  const section = vendre.match(/<details\b[^>]*data-photo-method[^>]*>([\s\S]*?)<\/details>/);
  assert.ok(section);
  assert.doesNotMatch(section[0].split('>')[0], /\bopen\b/);
  assert.match(section[1], /<summary[^>]*focus-visible:[^>]*>Notre matériel et notre méthode<\/summary>/);
  for (const text of ['Canon EOS R50', 'Canon RF-S 10-18', 'DJI Mini 3', 'Trépied K&F', 'Prise de vue en bracketing', 'Photoshop & Luminar Neo']) assert.ok(section[1].includes(text));
});

test('la page vendeur garde les accès estimation et les délais distincts', () => {
  assert.match(vendre, /href: "#estimation"/);
  assert.match(vendre, /id="estimation"/);
  assert.match(vendre, /24 heures maximum après la visite/);
  assert.match(vendre, /Réponse sous 48h/);
});

test('la condition de description programme ne peut plus rendre le nombre zéro', () => {
  assert.match(programme, /\{Boolean\(p\.intro \|\| \(p\.caracteristiques \|\| \[\]\)\.length \|\| \(p\.finitions \|\| \[\]\)\.length \|\| \(p\.pointsForts \|\| \[\]\)\.length\) &&/);
});
