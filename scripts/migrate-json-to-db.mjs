#!/usr/bin/env node
/**
 * Importe les fichiers data/*.json existants dans la base PostgreSQL
 * (table `data_store`). À lancer une fois, depuis un environnement où le
 * dossier `data/` contient les données réelles (le serveur actuel ou une
 * copie de sauvegarde), avec la variable DATABASE_URL pointant vers la base.
 *
 *   DATABASE_URL="postgres://…" node scripts/migrate-json-to-db.mjs
 *
 * Par défaut, une clé déjà présente en base n'est PAS écrasée (sécurité).
 * Utiliser --force pour remplacer le contenu existant en base par celui des
 * fichiers, et --dir=<chemin> pour lire un autre dossier que ./data.
 */
import fs from 'fs/promises';
import path from 'path';
import pg from 'pg';

const args = process.argv.slice(2);
const force = args.includes('--force');
const dirArg = args.find((a) => a.startsWith('--dir='));
const DATA_DIR = path.resolve(dirArg ? dirArg.slice('--dir='.length) : 'data');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL manquant. Exemple :');
  console.error('   DATABASE_URL="postgres://user:pass@host:5432/db" node scripts/migrate-json-to-db.mjs');
  process.exit(1);
}

function sslConfig(u) {
  if (/\bsslmode=disable\b/i.test(u)) return false;
  if (/localhost|127\.0\.0\.1|\/cloudsql\//i.test(u)) return false;
  return { rejectUnauthorized: false };
}

const pool = new pg.Pool({ connectionString: url, ssl: sslConfig(url) });

async function main() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS data_store (
       key        text PRIMARY KEY,
       value      jsonb NOT NULL,
       updated_at timestamptz NOT NULL DEFAULT now()
     )`,
  );

  let files;
  try {
    files = (await fs.readdir(DATA_DIR)).filter((f) => f.endsWith('.json'));
  } catch (err) {
    console.error(`❌ Dossier introuvable : ${DATA_DIR} (${err.message})`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log(`Aucun fichier .json dans ${DATA_DIR}. Rien à importer.`);
    return;
  }

  console.log(`Import depuis ${DATA_DIR} vers la base (${force ? 'écrasement activé' : 'sans écrasement'}) :\n`);

  for (const file of files) {
    const raw = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
    let value;
    try {
      value = JSON.parse(raw || '[]');
    } catch {
      console.log(`  ⚠️  ${file} : JSON invalide, ignoré`);
      continue;
    }
    const count = Array.isArray(value) ? `${value.length} entrée(s)` : 'objet';
    const sql = force
      ? `INSERT INTO data_store (key, value, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`
      : `INSERT INTO data_store (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`;
    const res = await pool.query(sql, [file, JSON.stringify(value)]);
    const applied = res.rowCount > 0;
    console.log(
      `  ${applied ? '✅' : '⏭️ '} ${file.padEnd(24)} ${count}` +
        (applied ? '' : ' — déjà en base, conservé (utiliser --force pour écraser)'),
    );
  }

  console.log('\nTerminé.');
}

main()
  .catch((err) => {
    console.error('❌ Échec de la migration :', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
