import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  disponible as gcsDisponible,
  lireJSON as gcsLire,
  ecrireJSON as gcsEcrire,
  modifierAtomiquement,
} from './gcsStore.ts';
const DATA_DIR = path.join(process.cwd(), 'data');
async function ensureDataDir() { try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch {} }
// Lecture par l'API GCS quand elle est disponible, sinon par le fichier monté.
// Le chemin doit être LE MÊME que celui de l'écriture : lire par gcsfuse ce
// qu'on écrit par l'API donne deux vues divergentes du même fichier.
export async function readJSON(file: string) {
  try {
    const parAPI = await gcsLire(file);
    if (parAPI !== null) return parAPI;
  } catch (e) {
    console.error(`[donnees] lecture API indisponible pour ${file}, repli fichier :`, e);
  }
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
  return withFileLock(file, async () => {
    try {
      if (await gcsEcrire(file, data)) return;
    } catch (e) {
      console.error(`[donnees] écriture API indisponible pour ${file}, repli fichier :`, e);
    }
    await ensureDataDir();
    await atomicWrite(p, data);
  });
}

// Sentinelle à renvoyer depuis le mutateur d'updateJSON pour ressortir SANS
// écrire — cas « rien trouvé, rien à changer ». Sans elle, une route qui répond
// 404 réécrivait quand même le fichier à l'identique : une version de plus dans
// l'historique du bucket à chaque requête sur un identifiant inexistant.
export const SANS_ECRITURE: unique symbol = Symbol('sans-ecriture');

// Lecture-modification-écriture ATOMIQUE (verrou + écriture atomique).
//
// C'est la SEULE façon correcte de modifier un fichier de données. Le couple
// readJSON(...) puis writeJSON(...) écrit par-dessus ce qu'une autre requête a
// pu enregistrer entre les deux : la lecture rend la main (await), une autre
// requête passe, et l'écriture finale l'efface. Le lead ainsi perdu ne laisse
// aucune trace. Voir lib/README-donnees.md.
//
// `mutate` reçoit la donnée fraîche, sous verrou, et renvoie le tableau à
// écrire — ou SANS_ECRITURE pour ne rien écrire du tout.
export async function updateJSON<T = any>(
  file: string,
  mutate: (data: any[]) => T | typeof SANS_ECRITURE | Promise<T | typeof SANS_ECRITURE>
): Promise<T | typeof SANS_ECRITURE> {
  // Compare-et-échange sur l'API quand elle est là — c'est ce qui rend
  // l'écriture sûre entre instances. Le verrou en mémoire ci-dessous ne protège
  // qu'un processus, et Cloud Run peut en lancer plusieurs.
  //
  // `mutate` peut être REJOUÉE en cas de conflit : elle reçoit alors la donnée
  // fraîche. Elle ne doit donc avoir aucun effet de bord externe — pas d'envoi
  // d'email, pas d'écriture ailleurs — seulement transformer le tableau reçu.
  //
  // Si le compare-et-échange épuise ses tentatives, on LÈVE. Retomber sur le
  // fichier réécrirait par-dessus une écriture concurrente réussie : c'est
  // exactement le défaut qui a fait annuler la première version.
  try {
    if (await gcsDisponible()) {
      const r = await modifierAtomiquement<T | typeof SANS_ECRITURE>(
        file,
        mutate as any,
        (x: unknown) => x === SANS_ECRITURE
      );
      if (r.ok) return r.resultat;
    }
  } catch (e) {
    if (await gcsDisponible()) throw e;   // l'API est là mais a échoué : ne pas masquer
    console.error(`[donnees] API indisponible pour ${file}, repli fichier :`, e);
  }

  const p = path.join(DATA_DIR, file);
  return withFileLock(file, async () => {
    await ensureDataDir();
    const data = await readJSON(file);
    const result = await mutate(data);
    if (result === SANS_ECRITURE) return result;
    await atomicWrite(p, Array.isArray(result) ? result : data);
    return result;
  });
}
// Identifiant non devinable (12 octets aléatoires cryptographiques → 24 hex).
export function uid(prefix = '') { return prefix + crypto.randomBytes(12).toString('hex'); }

export type VideoInfo = { provider: 'youtube' | 'vimeo'; id: string };

// Identifie la vidéo (fournisseur + identifiant) à partir d'une URL publique.
// La construction de l'iframe est déléguée à <VideoEmbed>, qui ne la charge
// qu'au clic — voir components/VideoEmbed.tsx.
export function getVideoInfo(url?: string): VideoInfo | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop();
      return id ? { provider: 'youtube', id } : null;
    }
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '');
      return id ? { provider: 'youtube', id } : null;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return id ? { provider: 'vimeo', id } : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function getVideoEmbedUrl(url?: string): string | null {
  const v = getVideoInfo(url);
  if (!v) return null;
  return v.provider === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${v.id}`
    : `https://player.vimeo.com/video/${v.id}`;
}

export function isImageDocument(doc?: string): boolean {
  if (!doc) return false;
  return /^data:image\//.test(doc) || /\.(jpe?g|png|webp|gif)$/i.test(doc);
}
