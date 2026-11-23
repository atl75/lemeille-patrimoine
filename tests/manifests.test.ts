import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import publicManifest from '../lib/publicManifest.ts';
import terrainManifest from '../lib/terrainManifest.ts';

test('installation publique : identité et démarrage publics, pas de formulaire privé', () => {
  const manifest = publicManifest();
  assert.equal(manifest.id, '/'); assert.equal(manifest.start_url, '/'); assert.equal(manifest.scope, '/');
  assert.equal(manifest.name, 'Lemeille Patrimoine');
  assert.equal(manifest.display, 'standalone');
  assert.doesNotMatch(manifest.description!, /signés|terrain|offres d'achat/);
});
test('installation terrain : contrat historique intégralement conservé', () => {
  assert.deepEqual(terrainManifest(), {
    name: 'Lemeille Patrimoine', short_name: 'Lemeille',
    description: "Bons de visite et offres d'achat signés sur le terrain.",
    start_url: '/terrain', scope: '/', display: 'standalone', orientation: 'portrait',
    background_color: '#f6f4ef', theme_color: '#1F3B2C',
    icons: [
      { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/logo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    ],
  });
});
test('les deux identités sont distinctes et les valeurs ne sont pas partagées par mutation', () => {
  const publicApp = publicManifest(), terrain = terrainManifest();
  assert.notEqual(publicApp.id || publicApp.start_url, terrain.id || terrain.start_url);
  publicApp.icons!.push({ src: '/fictif' });
  assert.equal(publicManifest().icons!.length, 1); assert.equal(terrain.icons!.length, 2);
});
test('favicon public existant et vectoriel : dimensions non inventées', async () => {
  assert.deepEqual(publicManifest().icons, [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]);
  const svg = await fs.readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8');
  assert.match(svg, /<svg[^>]+viewBox="0 0 64 64"/);
});
test('aucun manifest automatique racine ne remplace les deux choix explicites', async () => {
  for (const file of ['manifest.ts', 'manifest.js', 'manifest.json', 'manifest.webmanifest']) {
    try {
      const stat = await fs.stat(new URL('../app/' + file, import.meta.url));
      assert.ok(stat.isDirectory(), 'Un fichier racine imposerait le manifest terrain : ' + file);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  assert.match(await fs.readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8'), /manifest: '\/site.webmanifest'/);
  assert.match(await fs.readFile(new URL('../app/terrain/layout.tsx', import.meta.url), 'utf8'), /manifest: '\/manifest.webmanifest'/);
});
