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
