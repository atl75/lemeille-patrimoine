import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('le lien de secteur des fiches utilise une couleur lisible sur fond clair', () => {
  const source = readFileSync(new URL('../app/immobilier/biens/[id]/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /data-testid="link-secteur"/);
  assert.match(source, /text-sm font-medium text-luxe\/80/);
  assert.doesNotMatch(source, /data-testid="link-secteur"[^>]*text-\[#B89C6D\]/);
});
