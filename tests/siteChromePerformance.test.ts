import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('le chatbot secondaire est séparé du paquet initial du shell', () => {
  const source = readFileSync(new URL('../components/SiteChrome.tsx', import.meta.url), 'utf8');
  assert.match(source, /dynamic\(\(\) => import\("@\/components\/ChatWidget"\), \{ ssr: false/);
  assert.match(source, /const ChatWidget/);
});

test('les liens sociaux du pied de page conservent leur texte visible dans le nom accessible', () => {
  const source = readFileSync(new URL('../components/Footer.tsx', import.meta.url), 'utf8');
  assert.match(source, /aria-label="@lempatrimoine — Suivez Lemeille Patrimoine sur X/);
  assert.match(source, /aria-label="Notre chaîne YouTube — Lemeille Patrimoine"/);
  assert.match(source, /aria-label="Arthur Lemeille sur LinkedIn — profil professionnel"/);
});
