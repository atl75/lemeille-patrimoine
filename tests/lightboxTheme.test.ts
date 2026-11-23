import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('visionneuse : fond blanc opaque, contrôles contrastés et chargement visible', () => {
  const source=readFileSync(new URL('../components/Lightbox.tsx',import.meta.url),'utf8');
  assert.match(source,/lightbox-dialog[^"\n]*bg-white text-\[#1F3B2C\]/);
  assert.doesNotMatch(source,/bg-black|text-white|border-t-white/);
  assert.match(source,/border-t-\[#1F3B2C\]/);
  assert.match(source,/aria-label="Fermer"/);
  assert.match(source,/aria-label="Image suivante"/);
  assert.match(source,/aria-label="Image précédente"/);
});
test('visionneuse : arrière-plan natif également blanc', () => {
  const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
  assert.match(css,/\.lightbox-dialog::backdrop\s*\{\s*background:\s*#fff;/);
});
