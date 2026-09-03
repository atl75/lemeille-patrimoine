/**
 * Accès aux données par l'API JSON de Google Cloud Storage.
 *
 * LECTURE ET ÉCRITURE PAR LE MÊME CHEMIN. C'est le point qui a fait échouer la
 * première tentative, le 3 septembre au matin : écrire par l'API et lire par le
 * montage gcsfuse donne deux vues du même fichier, et une lecture suivant une
 * écriture renvoyait la donnée d'avant. Les deux passent désormais par l'API.
 *
 * ÉCRITURE SOUS PRÉCONDITION. GCS accepte `ifGenerationMatch` : « n'écris que si
 * l'objet est toujours dans la version que j'ai lue ». C'est un compare-et-
 * échange fortement cohérent, qui rend l'écriture sûre ENTRE INSTANCES — ce que
 * le verrou en mémoire de lib/utils.ts ne peut pas faire. Sur conflit, GCS
 * répond 412 et la mutation est rejouée sur la donnée fraîche.
 *
 * CACHE COURT EN LECTURE. Sans lui, chaque rendu paierait un aller-retour
 * réseau — l'accueil lit trois fois le même fichier. Le cache est invalidé par
 * toute écriture de CETTE instance, donc une lecture qui suit une écriture voit
 * toujours la bonne donnée.
 *
 * JAMAIS ACTIF SOUS TEST. La première tentative a écrit un fichier d'essai dans
 * le bucket de PRODUCTION, parce que les tests tournaient dans Cloud Build —
 * qui est un environnement GCP. Le garde-fou ne dépend plus d'une variable
 * qu'on peut oublier de poser : il reconnaît le lanceur de tests lui-même.
 */

const BUCKET = process.env.DATA_BUCKET || "lemeille-patrimoine-2026-data";
const METADATA =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

const MAX_TENTATIVES = 6;
const ATTENTE_BASE_MS = 40;

type Jeton = { valeur: string; expire: number };
let jetonCache: Jeton | null = null;
let apiUtilisable: boolean | null = null; // null = pas encore testé

/** Jeton d'accès du compte de service, via le serveur de métadonnées. */
async function jeton(): Promise<string | null> {
  const maintenant = Date.now();
  if (jetonCache && jetonCache.expire > maintenant + 30_000) return jetonCache.valeur;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch(METADATA, {
      headers: { "Metadata-Flavor": "Google" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = (await r.json()) as { access_token: string; expires_in: number };
    jetonCache = { valeur: j.access_token, expire: maintenant + j.expires_in * 1000 };
    return jetonCache.valeur;
  } catch {
    return null; // pas sur Cloud Run, ou métadonnées injoignables
  }
}

/** L'API est-elle utilisable ici ? Testé une fois, puis mémorisé. */
export async function disponible(): Promise<boolean> {
  // NODE_TEST_CONTEXT est posé par « node --test » lui-même : contrairement à
  // NODE_ENV, il ne peut pas être oublié dans un script npm. C'est cet oubli
  // qui avait laissé les tests écrire dans le bucket de production.
  if (
    process.env.NODE_TEST_CONTEXT ||
    process.env.NODE_ENV === "test" ||
    process.env.LP_SANS_GCS === "1"
  ) return false;
  if (apiUtilisable !== null) return apiUtilisable;
  apiUtilisable = (await jeton()) !== null;
  return apiUtilisable;
}

const objet = (fichier: string) =>
  `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(fichier)}`;

/**
 * Lit le contenu et la génération courante.
 * Génération "0" = l'objet n'existe pas (précondition de création).
 */
async function lire(
  fichier: string,
  auth: string
): Promise<{ donnees: any[]; generation: string }> {
  const r = await fetch(`${objet(fichier)}?alt=media`, {
    headers: { Authorization: `Bearer ${auth}` },
    cache: "no-store",
  });
  if (r.status === 404) return { donnees: [], generation: "0" };
  if (!r.ok) throw new Error(`lecture GCS ${r.status}`);
  const generation = r.headers.get("x-goog-generation") || "0";
  const texte = await r.text();
  let donnees: any;
  try {
    donnees = JSON.parse(texte || "[]");
  } catch {
    // Un JSON illisible ne doit jamais être écrasé en silence : mieux vaut
    // échouer et laisser le chemin fichier prendre le relais.
    throw new Error("JSON illisible dans le bucket");
  }
  return { donnees: Array.isArray(donnees) ? donnees : [], generation };
}

/** Écrit sous précondition. Renvoie false si la génération a changé (412). */
async function ecrire(
  fichier: string,
  auth: string,
  contenu: any,
  generation: string
): Promise<boolean> {
  const url =
    `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o` +
    `?uploadType=media&name=${encodeURIComponent(fichier)}` +
    `&ifGenerationMatch=${generation}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(contenu, null, 2),
  });
  if (r.status === 412) return false; // quelqu'un a écrit entre-temps
  if (!r.ok) throw new Error(`écriture GCS ${r.status}`);
  return true;
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Cache par fichier, propre à l'instance. Trois secondes : assez pour absorber
// les lectures répétées d'un même rendu, assez court pour qu'une écriture faite
// par une AUTRE instance soit vue rapidement.
const TTL_MS = 3000;
const cache = new Map<string, { donnees: any[]; generation: string; expire: number }>();

function memoriser(fichier: string, donnees: any[], generation: string) {
  cache.set(fichier, { donnees, generation, expire: Date.now() + TTL_MS });
}

/** Vide le cache d'un fichier — après toute écriture de cette instance. */
export function oublier(fichier: string) {
  cache.delete(fichier);
}

/**
 * Lit un fichier. Renvoie `null` si l'API n'est pas utilisable ici : l'appelant
 * doit alors reprendre le chemin fichier.
 */
export async function lireJSON(fichier: string): Promise<any[] | null> {
  if (!(await disponible())) return null;
  const frais = cache.get(fichier);
  if (frais && frais.expire > Date.now()) return frais.donnees;
  const auth = await jeton();
  if (!auth) return null;
  const { donnees, generation } = await lire(fichier, auth);
  memoriser(fichier, donnees, generation);
  return donnees;
}

/**
 * Écrit un fichier sans précondition — remplacement volontaire du contenu.
 * Renvoie false si l'API n'est pas utilisable.
 */
export async function ecrireJSON(fichier: string, donnees: any): Promise<boolean> {
  if (!(await disponible())) return false;
  const auth = await jeton();
  if (!auth) return false;
  const url =
    `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o` +
    `?uploadType=media&name=${encodeURIComponent(fichier)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(donnees, null, 2),
  });
  if (!r.ok) throw new Error(`écriture GCS ${r.status}`);
  oublier(fichier);
  return true;
}

/**
 * Applique `mutation` au fichier, de façon atomique entre toutes les instances.
 *
 * Renvoie `{ ok: false }` si l'API n'est pas utilisable ici — l'appelant doit
 * alors reprendre le chemin fichier. Lève si l'API répond mal : c'est aussi à
 * l'appelant de retomber sur le chemin fichier.
 */
export async function modifierAtomiquement<T>(
  fichier: string,
  mutation: (donnees: any[]) => T | Promise<T>,
  estSansEcriture: (r: unknown) => boolean
): Promise<{ ok: true; resultat: T } | { ok: false }> {
  if (!(await disponible())) return { ok: false };
  const auth = await jeton();
  if (!auth) return { ok: false };

  for (let tentative = 0; tentative < MAX_TENTATIVES; tentative++) {
    const { donnees, generation } = await lire(fichier, auth);
    const resultat = await mutation(donnees);

    if (estSansEcriture(resultat)) return { ok: true, resultat: resultat as T };

    const aEcrire = Array.isArray(resultat) ? resultat : donnees;
    if (await ecrire(fichier, auth, aEcrire, generation)) {
      // La donnée écrite est celle que verra la prochaine lecture de cette
      // instance : on la mémorise plutôt que de la relire.
      oublier(fichier);
      return { ok: true, resultat: resultat as T };
    }

    // 412 : une autre instance a écrit. On rejoue la mutation sur la donnée
    // fraîche, après une attente croissante et désynchronisée.
    await dormir(ATTENTE_BASE_MS * 2 ** tentative + Math.floor(Math.random() * 40));
  }

  throw new Error(
    `${fichier} : ${MAX_TENTATIVES} tentatives de compare-et-échange sans succès`
  );
}
