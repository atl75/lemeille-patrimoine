import { urlDvf } from './dvf.ts';

export type DvfSource = { status: 'ok'; csv: string } | { status: 'absent' } | { status: 'error' };
export const MAX_DVF_BYTES = 32 * 1024 * 1024;
const requiredColumns = ['id_mutation', 'date_mutation', 'nature_mutation', 'valeur_fonciere', 'adresse_numero', 'adresse_nom_voie', 'type_local', 'surface_reelle_bati', 'nombre_pieces_principales', 'longitude', 'latitude'];

export function validDvfHeader(csv: string): boolean {
  const columns = csv.split('\n', 1)[0].replace(/^\uFEFF/, '').trim().split(',');
  return requiredColumns.every(name => columns.includes(name));
}

/** Cache local borné, réservé aux fichiers valides ; aucune panne mémorisée. */
export function createDvfSource({ fetchImpl = fetch, now = Date.now, timeoutMs = 20000, cacheMs = 6 * 60 * 60 * 1000, cacheMax = 8, maxBytes = MAX_DVF_BYTES }: {
  fetchImpl?: typeof fetch; now?: () => number; timeoutMs?: number; cacheMs?: number; cacheMax?: number; maxBytes?: number;
} = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new Error('Limite DVF invalide');
  const cache = new Map<string, { csv: string; at: number }>();
  return async (insee: string, year: number, externalSignal?: AbortSignal): Promise<DvfSource> => {
    if (externalSignal?.aborted) return { status: 'error' };
    const key = `${insee}:${year}`;
    const previous = cache.get(key);
    if (previous && now() - previous.at < cacheMs) return { status: 'ok', csv: previous.csv };
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let rejectCancellation!: (error: Error) => void;
    const cancellation = new Promise<never>((_, reject) => { rejectCancellation = reject; });
    const abortFromOutside = () => {
      rejectCancellation(new Error('Recherche DVF annulée'));
      controller.abort();
    };
    try {
      externalSignal?.addEventListener('abort', abortFromOutside, { once: true });
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { reject(new Error('Délai DVF dépassé')); controller.abort(); }, timeoutMs);
      });
      const request = (async (): Promise<DvfSource> => {
        const response = await fetchImpl(urlDvf(insee, year), {
          signal: controller.signal, cache: 'no-store',
          headers: { 'User-Agent': 'LemeillePatrimoine/1.0 (+https://lemeillepatrimoine.com)' },
        });
        // Libérer aussi les corps des refus HTTP et des réponses arrivées après expiration.
        if (controller.signal.aborted || !response.ok || !response.body) {
          void response.body?.cancel().catch(() => {});
          return { status: !controller.signal.aborted && response.status === 404 ? 'absent' : 'error' };
        }
        const reader = response.body.getReader();
        const cancel = () => { void reader.cancel().catch(() => {}); };
        controller.signal.addEventListener('abort', cancel, { once: true });
        let complete = false;
        let bytes = 0;
        const parts: string[] = [];
        const decoder = new TextDecoder();
        try {
          // Content-Length peut manquer ou décrire la taille compressée : compter
          // les octets réellement délivrés par le flux, avant de décoder le CSV.
          if (Number(response.headers.get('content-length')) > maxBytes) throw new Error('Fichier DVF trop volumineux');
          while (true) {
            const { done, value } = await reader.read();
            if (controller.signal.aborted) throw new Error('Lecture DVF annulée');
            if (done) { complete = true; break; }
            bytes += value.byteLength;
            if (bytes > maxBytes) throw new Error('Fichier DVF trop volumineux');
            parts.push(decoder.decode(value, { stream: true }));
          }
          parts.push(decoder.decode());
        } finally {
          controller.signal.removeEventListener('abort', cancel);
          if (!complete) cancel();
          reader.releaseLock();
        }
        const csv = parts.join('').replace(/^\uFEFF/, '');
        return validDvfHeader(csv) ? { status: 'ok', csv } : { status: 'error' };
      })();
      const result = await Promise.race([request, deadline, cancellation]);
      if (controller.signal.aborted) return { status: 'error' };
      if (result.status === 'ok') {
        // Ne mettre en cache qu'après la course : une réponse tardive ne le remplit pas.
        cache.delete(key);
        cache.set(key, { csv: result.csv, at: now() });
        while (cache.size > cacheMax) cache.delete(cache.keys().next().value as string);
      }
      return result;
    } catch {
      return { status: 'error' };
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', abortFromOutside);
    }
  };
}
