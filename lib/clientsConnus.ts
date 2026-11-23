export const champsClient = ['firstName', 'lastName', 'name', 'address', 'email', 'phone', 'siren', 'legalForm', 'managerFirstName', 'managerLastName', 'managerRole'] as const;
export type ClientConnu = { type: string } & Partial<Record<typeof champsClient[number], string>>;
export type SuggestionClient = { client: ClientConnu; source: string };
const normaliser = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export function extraireClient(value: any): ClientConnu {
  const client: ClientConnu = { type: value?.type === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL' };
  for (const key of champsClient) client[key] = typeof value?.[key] === 'string' ? value[key].trim() : '';
  return client;
}
export function rechercherClients(sources: { source: string; value: unknown }[], query: string): SuggestionClient[] {
  const q = normaliser(query);
  if (q.length < 2) return [];
  const vus = new Set<string>();
  return sources.flatMap(({ source, value }) => {
    const client = extraireClient(value);
    const contenu = normaliser(champsClient.map(k => client[k] || '').join(' '));
    if (!q.split(' ').every(mot => contenu.includes(mot))) return [];
    // Ne fusionne jamais des homonymes ou des fiches contradictoires.
    const key = JSON.stringify(client);
    if (vus.has(key)) return [];
    vus.add(key);
    return [{ client, source }];
  }).slice(0, 20);
}
