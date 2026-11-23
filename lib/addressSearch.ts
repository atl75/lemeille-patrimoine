import { geocodingUrl } from './geocodingUrl.ts';

export type AddressSuggestion = {
  properties: { label: string; city: string; postcode: string; context: string };
};

export type AddressSearchState = {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error';
  suggestions: AddressSuggestion[];
};

export function addressSearchUrl(query: string): string {
  return geocodingUrl(query, true);
}

/** La réponse tierce reste inconnue : ne conserver que les champs utilisés. */
export function parseAddressSuggestions(data: unknown): AddressSuggestion[] {
  if (!data || typeof data !== 'object' || !('features' in data) || !Array.isArray(data.features)) {
    throw new Error('Réponse d’adresses invalide');
  }
  const suggestions: AddressSuggestion[] = [];
  for (const feature of data.features) {
    const p = feature?.properties;
    if (!p || typeof p.label !== 'string' || !p.label.trim() || typeof p.city !== 'string' || !p.city.trim()) continue;
    if (suggestions.some(s => s.properties.label === p.label)) continue;
    suggestions.push({ properties: {
      label: p.label, city: p.city,
      postcode: typeof p.postcode === 'string' ? p.postcode : '',
      context: typeof p.context === 'string' ? p.context : '',
    } });
    if (suggestions.length === 8) break;
  }
  return suggestions;
}

export function addressComponents(suggestion: AddressSuggestion) {
  const { label, city, postcode, context } = suggestion.properties;
  // « Est » est le libellé métier ; seule la mention explicite Grand Est
  // déclenche ce classement automatique. Les autres classements sont conservés.
  const region = context.includes('Île-de-France') || context.includes('Paris') ? 'PARIS'
    : context.includes('Normandie') ? 'NORMANDIE' : /grand[\s-]+est/i.test(context) ? 'EST' : 'COTE_D_AZUR';
  const arrondissement = /^75\d{3}$/.test(postcode) ? Number(postcode.slice(2)) : 0;
  return {
    address: label,
    city: arrondissement >= 1 && arrondissement <= 20 ? `Paris ${arrondissement}e` : city,
    region,
  };
}

/** Une instance par champ : aucune réponse périmée, même si fetch ignore abort. */
export function createAddressSearch(
  publish: (state: AddressSearchState) => void,
  { fetchImpl = fetch, debounceMs = 300, timeoutMs = 6000 }: {
    fetchImpl?: typeof fetch; debounceMs?: number; timeoutMs?: number;
  } = {},
) {
  let generation = 0;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  function cancel() {
    generation++;
    clearTimeout(debounce);
    clearTimeout(deadline);
    controller?.abort();
    controller = undefined;
  }
  function search(query: string) {
    cancel();
    publish({ status: 'idle', suggestions: [] });
    if (query.trim().length < 3) return;
    const current = generation;
    debounce = setTimeout(async () => {
      const request = new AbortController();
      controller = request;
      publish({ status: 'loading', suggestions: [] });
      deadline = setTimeout(() => {
        if (current !== generation) return;
        cancel();
        publish({ status: 'error', suggestions: [] });
      }, timeoutMs);
      try {
        const response = await fetchImpl(addressSearchUrl(query), {
          signal: request.signal, credentials: 'omit', referrerPolicy: 'no-referrer',
        });
        if (current !== generation) return;
        if (!response.ok) throw new Error('Service d’adresses indisponible');
        const suggestions = parseAddressSuggestions(await response.json());
        if (current !== generation) return;
        publish({ status: suggestions.length ? 'ready' : 'empty', suggestions });
      } catch {
        if (current === generation) publish({ status: 'error', suggestions: [] });
      } finally {
        // Ne jamais arrêter le délai ou le chargement d'une requête plus récente.
        if (current === generation) {
          clearTimeout(deadline);
          controller = undefined;
        }
      }
    }, debounceMs);
  }
  return { search, cancel };
}
