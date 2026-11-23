import { z } from 'zod';
import { geocodingUrl } from './geocodingUrl.ts';

const pointSchema = z.object({
  geometry: z.object({ type: z.literal('Point'), coordinates: z.tuple([
    z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90),
  ]) }),
  properties: z.object({
    citycode: z.string().regex(/^(?:\d{5}|2[AB]\d{3})$/),
    label: z.string().trim().min(1), type: z.string().trim().min(1), score: z.number().finite().min(0).max(1),
  }),
});

export function parseGeocodedAddress(data: unknown) {
  if (!data || typeof data !== 'object' || !('features' in data) || !Array.isArray(data.features)) {
    throw new Error('Réponse de géocodage invalide');
  }
  if (!data.features.length) return null;
  const parsed = pointSchema.safeParse(data.features[0]);
  if (!parsed.success) throw new Error('Coordonnées de géocodage invalides');
  const { geometry, properties } = parsed.data;
  return { lon: geometry.coordinates[0], lat: geometry.coordinates[1], insee: properties.citycode,
    label: properties.label, precision: properties.type, score: properties.score };
}

type ServiceOptions = { fetchImpl?: typeof fetch; timeoutMs?: number; signal?: AbortSignal };

/** Le délai englobe le corps JSON, même si le transport ignore l'annulation. */
export async function fetchGeographicJson(url: string, { fetchImpl = fetch, timeoutMs = 10000, signal }: ServiceOptions = {}): Promise<unknown> {
  if (signal?.aborted) throw new Error('Recherche géographique annulée');
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectCancellation!: (error: Error) => void;
  const cancellation = new Promise<never>((_, reject) => { rejectCancellation = reject; });
  const onAbort = () => { rejectCancellation(new Error('Recherche géographique annulée')); controller.abort(); };
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error('Service géographique indisponible'));
        controller.abort();
      }, timeoutMs);
    });
    const request = (async () => {
      const response = await fetchImpl(url, {
        signal: controller.signal, redirect: 'error', cache: 'no-store', credentials: 'omit',
        headers: { Accept: 'application/json' },
      });
      if (controller.signal.aborted || !response.ok) {
        void response.body?.cancel().catch(() => {});
        throw new Error('Service géographique indisponible');
      }
      return response.json();
    })();
    return await Promise.race([request, deadline, cancellation]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export async function geocodeAddress(address: string, options?: ServiceOptions) {
  return parseGeocodedAddress(await fetchGeographicJson(geocodingUrl(address), options));
}
