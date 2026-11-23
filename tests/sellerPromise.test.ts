import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

test('promesse estimation : 24 heures maximum après visite sur tous les points de contact', () => {
  const paths = [
    'app/page.tsx', 'app/vendre/page.tsx', 'app/immobilier/(liste)/page.tsx',
    'app/immobilier/estimation/page.tsx', 'app/qui-suis-je/page.tsx',
    'app/secteurs/[slug]/page.tsx', 'app/faq/page.tsx',
    'components/EstimationForm.tsx', 'components/HomeSeoJsonLd.tsx',
    'components/BandeauReassurance.tsx', 'lib/leadNotifications.ts', 'lib/chatbot.ts',
  ];
  for (const file of paths) {
    assert.match(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), /24 heures maximum après la visite/, file);
  }
  const scan = (dir: URL) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
      if (entry.isDirectory()) scan(url);
      else if (/\.[jt]sx?$/.test(entry.name)) {
        assert.doesNotMatch(readFileSync(url, 'utf8'), /(?:3|trois) jours (?:maximum )?après (?:la visite|visite|celle-ci)/i, url.pathname);
      }
    }
  };
  for (const dir of ['app/', 'components/', 'lib/']) scan(new URL('../' + dir, import.meta.url));
});

test('encart vendeur du catalogue : estimation après visite, interlocuteur unique', () => {
  const source = readFileSync(new URL('../app/immobilier/(liste)/page.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /Estimation gratuite en 2 minutes|Obtenez une fourchette indicative/);
  assert.match(source, /Arthur Lemeille vous rappelle sous 48 heures/);
  assert.match(source, /sous 24 heures maximum après la visite/);
});
