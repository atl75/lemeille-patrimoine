import fs from 'fs/promises';
import path from 'path';
import { DOCUMENT_FILE, DOCUMENT_TYPES } from './documentAccess.ts';

/** Réservé au serveur, après contrôle d'accès par la route appelante. */
export async function readStoredDocument(file: string) {
  if (!DOCUMENT_FILE.test(file)) throw new Error('Nom de document invalide');
  const buffer = await fs.readFile(path.join(process.cwd(), 'data', 'uploads', file));
  return { buffer, mime: DOCUMENT_TYPES[file.split('.').pop()!] };
}
