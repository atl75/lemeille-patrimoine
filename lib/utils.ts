import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
const DATA_DIR = path.join(process.cwd(), 'data');
async function ensureDataDir() { try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch {} }
export async function readJSON(file: string) {
  await ensureDataDir();
  const p = path.join(DATA_DIR, file);
  try { const raw = await fs.readFile(p, 'utf-8'); return JSON.parse(raw || '[]'); } catch { return []; }
}

// Sérialise les opérations d'écriture d'un même fichier (une file par fichier)
// pour éviter les écritures entrelacées / les pertes en concurrence.
const fileChains = new Map<string, Promise<unknown>>();
function withFileLock<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const prev = fileChains.get(file) || Promise.resolve();
  const run = prev.then(fn, fn);
  fileChains.set(file, run.then(() => {}, () => {}));
  return run;
}

// Écriture ATOMIQUE : on écrit dans un fichier temporaire puis on renomme.
// Un renommage remplace le fichier en une seule opération → jamais de JSON
// tronqué (donc plus de corruption possible sur crash/écriture partielle).
async function atomicWrite(p: string, data: any) {
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tmp, p);
}

export function writeJSON(file: string, data: any): Promise<void> {
  const p = path.join(DATA_DIR, file);
  return withFileLock(file, async () => { await ensureDataDir(); await atomicWrite(p, data); });
}

// Lecture-modification-écriture ATOMIQUE (verrou + écriture atomique).
// À utiliser pour toute écriture susceptible d'être concurrente (endpoints
// publics : leads, abonnés, analytics…) : `mutate` reçoit la donnée à jour et
// renvoie le tableau à écrire (ou modifie en place).
export async function updateJSON<T = any>(file: string, mutate: (data: any[]) => T | Promise<T>): Promise<T> {
  const p = path.join(DATA_DIR, file);
  return withFileLock(file, async () => {
    await ensureDataDir();
    const data = await readJSON(file);
    const result = await mutate(data);
    await atomicWrite(p, Array.isArray(result) ? result : data);
    return result;
  });
}
// Identifiant non devinable (12 octets aléatoires cryptographiques → 24 hex).
export function uid(prefix = '') { return prefix + crypto.randomBytes(12).toString('hex'); }

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
