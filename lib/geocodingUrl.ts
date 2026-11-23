/** Module sans dépendance serveur, également utilisé dans le navigateur. */
export function geocodingUrl(query: string, suggestions = false): string {
  const url = new URL('https://data.geopf.fr/geocodage/search');
  url.search = new URLSearchParams({
    q: query.trim(), limit: suggestions ? '8' : '1', index: 'address', autocomplete: suggestions ? '1' : '0',
  }).toString();
  return url.toString();
}
