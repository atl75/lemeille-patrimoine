/** JSON pour un élément <script>, jamais du HTML. Préserve les valeurs après JSON.parse. */
export function serializeJsonLd(value: unknown): string {
  const json = JSON.stringify(value);
  if (json === undefined) throw new TypeError('Données structurées non sérialisables');
  const escapes: Record<string, string> = {
    '<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029',
  };
  return json.replace(/[<>&\u2028\u2029]/g, character => escapes[character]);
}
