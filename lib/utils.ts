import fs from 'fs/promises';
import path from 'path';
import { getPool, ensureSchema } from './db';

const DATA_DIR = path.join(process.cwd(), 'data');
async function ensureDataDir() { try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch {} }

// Lecture depuis le fichier JSON embarqué (repli / données de seed).
async function readJSONFromFile(file: string) {
  await ensureDataDir();
  const p = path.join(DATA_DIR, file);
  try { const raw = await fs.readFile(p, 'utf-8'); return JSON.parse(raw || '[]'); } catch { return []; }
}

async function writeJSONToFile(file: string, data: any) {
  await ensureDataDir();
  const p = path.join(DATA_DIR, file);
  await fs.writeFile(p, JSON.stringify(data, null, 2), 'utf-8');
}

// Lecture d'une « collection » (ex: « properties.json »). Si une base
// PostgreSQL est configurée (DATABASE_URL), les données viennent de la table
// partagée `data_store` — même source pour toutes les instances et tous les
// appareils. Sinon, on lit le fichier JSON local (dev / repli).
export async function readJSON(file: string) {
  const pool = getPool();
  if (!pool) return readJSONFromFile(file);
  try {
    await ensureSchema(pool);
    const res = await pool.query('SELECT value FROM data_store WHERE key = $1', [file]);
    if (res.rows.length > 0) return res.rows[0].value;
    // Clé absente : on initialise la base à partir du fichier embarqué
    // (contenu de seed : articles, avis, programmes). Insertion sans écrasement
    // pour rester sûr en cas d'appels concurrents.
    const seed = await readJSONFromFile(file);
    try {
      await pool.query(
        'INSERT INTO data_store (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
        [file, JSON.stringify(seed)],
      );
    } catch (err) {
      console.error(`[db] Échec du seed initial de "${file}" :`, (err as Error).message);
    }
    return seed;
  } catch (err) {
    // La base est injoignable : on retombe sur le fichier embarqué pour que
    // le site public continue de s'afficher plutôt que de planter.
    console.error(`[db] Lecture de "${file}" impossible, repli sur le fichier :`, (err as Error).message);
    return readJSONFromFile(file);
  }
}

// Écriture d'une collection. Avec une base configurée, on remplace la valeur
// de la clé (source unique partagée). Sans base, on écrit le fichier local.
export async function writeJSON(file: string, data: any) {
  const pool = getPool();
  if (!pool) return writeJSONToFile(file, data);
  await ensureSchema(pool);
  // Pas de repli silencieux vers le disque en cas d'échec : sur une plateforme
  // multi-instances, un « succès » écrit sur un disque éphémère est justement
  // la cause du problème d'origine (données invisibles ailleurs, perdues au
  // redéploiement). On laisse donc l'erreur remonter pour qu'elle soit visible.
  await pool.query(
    `INSERT INTO data_store (key, value, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [file, JSON.stringify(data)],
  );
}
export function uid(prefix = '') { return prefix + Math.random().toString(36).slice(2, 10); }

export function getVideoEmbedUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function isImageDocument(doc?: string): boolean {
  if (!doc) return false;
  return /^data:image\//.test(doc) || /\.(jpe?g|png|webp|gif)$/i.test(doc);
}
