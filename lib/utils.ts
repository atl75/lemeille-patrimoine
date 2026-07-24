import fs from 'fs/promises';
import path from 'path';
const DATA_DIR = path.join(process.cwd(), 'data');
async function ensureDataDir() { try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch {} }
export async function readJSON(file: string) {
  await ensureDataDir();
  const p = path.join(DATA_DIR, file);
  try { const raw = await fs.readFile(p, 'utf-8'); return JSON.parse(raw || '[]'); } catch { return []; }
}
export async function writeJSON(file: string, data: any) {
  await ensureDataDir();
  const p = path.join(DATA_DIR, file);
  await fs.writeFile(p, JSON.stringify(data, null, 2), 'utf-8');
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
