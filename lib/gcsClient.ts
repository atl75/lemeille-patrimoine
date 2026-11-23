import { contenuAbsent } from './missingCollection.ts';
/** Client injectable : les tests fournissent un transport fictif, jamais GCS. */
type Environment = Record<string, string | undefined>;
type Options = {
  env: Environment;
  fetcher: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

export function analyserContenu(texte: string): any {
  try { return JSON.parse(texte); }
  catch { throw new Error('JSON illisible dans le bucket'); }
}

export function createGcsClient({ env, fetcher, sleep = ms => new Promise(r => setTimeout(r, ms)) }: Options) {
  const bucket = env.DATA_BUCKET || 'lemeille-patrimoine-2026-data';
  const obligatoire = Boolean(env.K_SERVICE || env.DATA_BUCKET);
  let utilisable: boolean | null = null;
  let token: { value: string; expires: number } | undefined;
  let tokenEnCours: Promise<string | null> | undefined;
  const cache = new Map<string, { data: any; expires: number }>();
  const objet = (file: string) => `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(file)}`;
  const upload = (file: string) => `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(file)}`;

  async function recupererJeton(): Promise<string | null> {
    // Seul ce GET sans effet de bord est rejoué. Hors GCP, garder une sonde courte.
    const tentatives = obligatoire ? 3 : 1;
    for (let attempt = 0; attempt < tentatives; attempt++) {
      try {
        const response = await fetcher('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
          headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(1500), cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          if (!data || typeof data.access_token !== 'string' || !data.access_token.trim() || !Number.isFinite(data.expires_in) || data.expires_in <= 0) return null;
          const expires = Date.now() + data.expires_in * 1000;
          if (!Number.isFinite(expires)) return null;
          token = { value: data.access_token, expires };
          return token.value;
        }
        // Un refus durable ou une URL incorrecte ne justifie pas de nouvelles tentatives.
        if (![408, 429, 500, 502, 503, 504].includes(response.status)) return null;
        await response.body?.cancel();
      } catch (error) {
        if (error instanceof SyntaxError) return null;
        // Erreur réseau ou délai dépassé : nouvelle tentative bornée.
      }
      if (attempt < tentatives - 1) await sleep(250 * 2 ** attempt + Math.floor(Math.random() * 100));
    }
    return null;
  }

  async function jeton(): Promise<string | null> {
    if (token && token.expires > Date.now() + 30_000) return token.value;
    // Une seule récupération pour les requêtes concurrentes, au démarrage comme au renouvellement.
    // Libérer aussi après un échec pour permettre la reprise à la requête suivante.
    if (!tokenEnCours) tokenEnCours = recupererJeton().finally(() => { tokenEnCours = undefined; });
    return tokenEnCours;
  }

  async function disponible(): Promise<boolean> {
    // Garde-fou du lanceur de tests, également présent dans l'adaptateur réel.
    if (env.NODE_TEST_CONTEXT || env.NODE_ENV === 'test' || env.LP_SANS_GCS === '1') return false;
    if (utilisable !== null) return utilisable;
    if (await jeton()) return (utilisable = true);
    // Une panne de métadonnées sur Cloud Run n'autorise JAMAIS le repli local.
    // Ne pas mémoriser l'échec : la prochaine requête pourra réessayer.
    if (obligatoire) throw new Error('Stockage GCS requis mais authentification indisponible');
    return (utilisable = false);
  }

  async function auth(): Promise<string> {
    const value = await jeton();
    if (!value) throw new Error('Authentification GCS indisponible');
    return value;
  }

  async function lire(file: string, authorization: string) {
    const response = await fetcher(`${objet(file)}?alt=media`, {
      headers: { Authorization: `Bearer ${authorization}` }, cache: 'no-store', signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 404) {
      // Une absence connue invalide aussi une ancienne lecture mise en cache.
      cache.delete(file);
      return { data: contenuAbsent(file), generation: '0' };
    }
    if (!response.ok) throw new Error(`Lecture GCS ${response.status}`);
    const generation = response.headers.get('x-goog-generation');
    if (!generation || !/^[1-9]\d*$/.test(generation)) throw new Error('Génération GCS absente ou invalide');
    return { data: analyserContenu(await response.text()), generation };
  }

  async function ecrire(file: string, authorization: string, data: any, generation?: string) {
    const response = await fetcher(upload(file) + (generation === undefined ? '' : `&ifGenerationMatch=${generation}`), {
      method: 'POST', headers: { Authorization: `Bearer ${authorization}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data, null, 2), signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 412 && generation !== undefined) return false;
    if (!response.ok) throw new Error(`Écriture GCS ${response.status}`);
    cache.delete(file);
    return true;
  }

  return {
    disponible,
    oublier(file: string) { cache.delete(file); },
    async lireJSON(file: string, options: { fresh?: boolean } = {}): Promise<any> {
      if (!(await disponible())) return null;
      const cached = cache.get(file);
      if (!options.fresh && cached && cached.expires > Date.now()) return structuredClone(cached.data);
      const { data } = await lire(file, await auth());
      cache.set(file, { data: structuredClone(data), expires: Date.now() + 3000 });
      return data;
    },
    async ecrireJSON(file: string, data: any): Promise<boolean> {
      if (!(await disponible())) return false;
      return ecrire(file, await auth(), data);
    },
    async modifierAtomiquement<T>(file: string, mutate: (data: any[]) => T | Promise<T>, sansEcriture: (value: unknown) => boolean): Promise<{ ok: true; resultat: T } | { ok: false }> {
      if (!(await disponible())) return { ok: false };
      const authorization = await auth();
      for (let attempt = 0; attempt < 6; attempt++) {
        const { data, generation } = await lire(file, authorization);
        if (!Array.isArray(data)) throw new Error(`Collection attendue pour ${file}`);
        const result = await mutate(data);
        if (sansEcriture(result)) return { ok: true, resultat: result };
        if (await ecrire(file, authorization, Array.isArray(result) ? result : data, generation)) return { ok: true, resultat: result };
        if (attempt < 5) await sleep(40 * 2 ** attempt + Math.floor(Math.random() * 40));
      }
      throw new Error(`${file} : 6 tentatives de compare-et-échange sans succès`);
    },
  };
}
