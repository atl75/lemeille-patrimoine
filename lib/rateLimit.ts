type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function cleanup(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

/**
 * Limiteur de débit simple en mémoire (par process). Suffisant pour un
 * serveur Node persistant (Cloud Run / node scripts/start.js) ; à
 * remplacer par un store partagé (Redis, etc.) en cas de scaling
 * multi-instance.
 */
export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  cleanup(now);

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Combien d'entrées notre propre infrastructure ajoute à la fin de
 * `X-Forwarded-For`. Sur Cloud Run en accès direct : une seule, l'adresse
 * réelle de l'appelant. Derrière un répartiteur Google, il en faudrait deux.
 */
const SAUTS_DE_CONFIANCE = Math.max(1, Number(process.env.PROXY_HOPS) || 1);

/**
 * L'adresse du client, telle qu'on peut la CROIRE.
 *
 * `X-Forwarded-For` est une liste que chaque relais ALLONGE PAR LA DROITE. Le
 * client contrôle donc entièrement le DÉBUT de la liste — il peut y écrire ce
 * qu'il veut — et rien de ce qui est ajouté après lui. La seule région digne
 * de foi est la FIN.
 *
 * L'ancienne version prenait `split(",")[0]` : exactement l'entrée que
 * l'appelant écrit. Il suffisait d'un en-tête différent à chaque requête pour
 * obtenir un compteur neuf et contourner toutes les limitations du projet, y
 * compris celle du chat facturé à l'API Anthropic.
 *
 * On compte donc DEPUIS LA FIN, et jamais depuis le début : un client qui
 * allonge la liste par la gauche ne fait que repousser ses propres valeurs,
 * il ne peut pas atteindre la position que notre infrastructure occupe.
 */
export function getClientIp(req: Request): string {
  const brut = req.headers.get("x-forwarded-for");
  if (brut) {
    const chaine = brut.split(",").map((x) => x.trim()).filter(Boolean);
    if (chaine.length) {
      // Si la liste est plus courte que prévu, on prend la toute première
      // entrée depuis la fin plutôt que de sortir du tableau.
      const i = Math.max(0, chaine.length - SAUTS_DE_CONFIANCE);
      return chaine[i];
    }
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

