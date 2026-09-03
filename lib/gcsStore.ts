/**
 * Lecture-modification-écriture ATOMIQUE ENTRE INSTANCES, via l'API JSON de
 * Google Cloud Storage.
 *
 * LE PROBLÈME QU'IL RÉSOUT
 * lib/utils.ts sérialise les écritures avec une file en mémoire du processus.
 * Elle protège parfaitement UNE instance. Cloud Run peut en lancer dix, chacune
 * avec la sienne, toutes écrivant les mêmes fichiers du bucket monté : deux
 * écritures simultanées sur deux instances différentes, et l'une efface l'autre.
 *
 * COMMENT
 * GCS accepte une précondition `ifGenerationMatch` sur l'écriture : « n'écris
 * que si l'objet est toujours dans la version que j'ai lue ». C'est un
 * compare-et-échange, fortement cohérent, et il ne dépend pas du montage
 * gcsfuse — donc pas non plus de son cache. On lit l'objet avec sa génération,
 * on applique la mutation, on réécrit sous précondition. Si un autre a écrit
 * entre-temps, GCS répond 412 et l'on recommence sur la donnée fraîche.
 *
 * DÉGRADATION
 * Tout est optionnel. Sans serveur de métadonnées (poste de développement),
 * sans droits, ou en cas de panne de l'API, `disponible()` renvoie faux et
 * lib/utils.ts reprend le chemin fichier d'aujourd'hui. Le pire cas est donc le
 * comportement actuel, jamais moins bon.
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
  const auth = await jeton();
  if (!auth) return { ok: false };

  for (let tentative = 0; tentative < MAX_TENTATIVES; tentative++) {
    const { donnees, generation } = await lire(fichier, auth);
    const resultat = await mutation(donnees);

    if (estSansEcriture(resultat)) return { ok: true, resultat: resultat as T };

    const aEcrire = Array.isArray(resultat) ? resultat : donnees;
    if (await ecrire(fichier, auth, aEcrire, generation)) {
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
