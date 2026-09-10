import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Le défaut que ces tests empêchent de revenir.
 *
 * Le SDK Resend RENVOIE ses erreurs au lieu de les lever : `send()` résout vers
 * `{ error }` quand le domaine n'est pas vérifié, quand le quota est dépassé ou
 * quand l'adresse est refusée. Onze appels du projet écrivaient `envoye = true`
 * juste après, dans un `try` qui ne se déclenchait que sur panne réseau.
 * L'agent lisait « lien de signature envoyé » et attendait une signature que le
 * mandant n'avait jamais été invité à donner.
 */

const RACINE = path.join(import.meta.dirname, '..');

function fichiersApi(): string[] {
  const trouves: string[] = [];
  const parcourir = (dossier: string) => {
    for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
      const complet = path.join(dossier, e.name);
      if (e.isDirectory()) parcourir(complet);
      else if (e.name.endsWith('.ts')) trouves.push(complet);
    }
  };
  parcourir(path.join(RACINE, 'app', 'api'));
  return trouves;
}

test('aucune route n’appelle Resend directement — tout passe par envoyerEmail', () => {
  // Le point d'envoi unique est le seul endroit qui lise `error`. Un appel
  // direct rouvrirait le trou, en silence et sans que rien ne le signale.
  const fautifs = fichiersApi().filter((f) => {
    const src = fs.readFileSync(f, 'utf8');
    return /\.emails\.send\s*\(/.test(src) && !/lib\/envoiEmail/.test(src);
  }).map((f) => path.relative(RACINE, f));

  // Exception assumée : /api/leads lit déjà `const { error } = await …`.
  const tolerees = new Set(['app/api/leads/route.ts']);
  const reels = fautifs.filter((f) => !tolerees.has(f));

  assert.deepEqual(
    reels, [],
    `Ces routes appellent Resend sans passer par envoyerEmail :\n  ${reels.join('\n  ')}\n` +
    `Or send() RENVOIE ses erreurs — un envoi refusé y passerait pour un succès.`,
  );
});

test('envoyerEmail distingue l’absence de configuration d’un échec', async () => {
  const memoire = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const { envoyerEmail } = await import('../lib/envoiEmail.ts');
    const r = await envoyerEmail({ to: 'client@example.com', subject: 's', html: '<p>x</p>' });
    assert.equal(r.ok, false);
    // En développement la clé n'est pas posée : ce n'est pas une panne, et
    // l'écran ne doit pas alerter l'agent comme si l'email avait été refusé.
    assert.equal(r.ok === false && r.configuration, true);
  } finally {
    if (memoire !== undefined) process.env.RESEND_API_KEY = memoire;
  }
});

test('une adresse invalide est refusée avant tout appel réseau', async () => {
  const memoire = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 're_test_jamais_utilisee';
  try {
    const { envoyerEmail } = await import('../lib/envoiEmail.ts');
    for (const to of ['', '   ', 'pas-une-adresse', []]) {
      const r = await envoyerEmail({ to: to as any, subject: 's', html: '<p>x</p>' });
      assert.equal(r.ok, false, `« ${String(to)} » aurait dû être refusée`);
      assert.equal(r.ok === false && r.configuration, undefined);
    }
  } finally {
    if (memoire === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = memoire;
  }
});
