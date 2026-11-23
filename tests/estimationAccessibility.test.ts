import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('formulaire estimation : structure de titres et textes d’aide lisibles', () => {
  const source = readFileSync(new URL('../components/EstimationForm.tsx', import.meta.url), 'utf8');
  assert.match(source, /<h2 tabIndex=\{-1\} data-estimation-focus="etape"/);
  assert.match(source, /text-xs text-luxe\/70/);
  assert.match(source, /text-luxe\/70">m²/);
});

test('bandeau CTA : région nommée pour les technologies d’assistance', () => {
  const source = readFileSync(new URL('../components/CtaBand.tsx', import.meta.url), 'utf8');
  assert.match(source, /role="region" aria-label="Prendre rendez-vous"/);
});
