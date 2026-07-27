import { Pool } from 'pg';

// Couche de persistance PostgreSQL partagée.
//
// Historiquement, l'application stockait ses données dans des fichiers JSON
// sur le disque (`data/*.json`). Sur un hébergement multi-instances comme
// Cloud Run, chaque instance a son propre disque : les saisies faites depuis
// un appareil n'étaient donc pas visibles depuis un autre. En branchant une
// vraie base de données Postgres, toutes les instances (et donc tous les
// appareils) lisent et écrivent la même source unique.
//
// Le stockage reste volontairement simple : une table clé/valeur `data_store`
// où la clé est le nom de fichier historique (ex: « properties.json ») et la
// valeur le contenu JSON complet. Cela permet de brancher la base sans
// réécrire les 22 routes API existantes — elles continuent d'appeler
// `readJSON` / `writeJSON` (voir lib/utils.ts).

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

// SSL : la plupart des bases managées (Cloud SQL via IP publique, Neon,
// Supabase…) exigent TLS. On le désactive pour les connexions locales et
// pour Cloud SQL via socket Unix (/cloudsql/…), et on le respecte si l'URL
// précise explicitement sslmode=disable.
function sslConfig(url: string): false | { rejectUnauthorized: boolean } {
  if (/\bsslmode=disable\b/i.test(url)) return false;
  if (/localhost|127\.0\.0\.1|\/cloudsql\//i.test(url)) return false;
  return { rejectUnauthorized: false };
}

// Renvoie le pool de connexions (singleton) ou null si aucune base n'est
// configurée — dans ce cas, lib/utils.ts retombe sur les fichiers JSON.
export function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 30_000,
      ssl: sslConfig(url),
    });
    // Évite qu'une erreur de connexion inactive ne fasse planter le process.
    pool.on('error', (err) => {
      console.error('[db] Erreur du pool PostgreSQL :', err.message);
    });
  }
  return pool;
}

// Crée la table clé/valeur si nécessaire (une seule fois par process).
export function ensureSchema(p: Pool): Promise<void> {
  if (!schemaReady) {
    schemaReady = p
      .query(
        `CREATE TABLE IF NOT EXISTS data_store (
           key        text PRIMARY KEY,
           value      jsonb NOT NULL,
           updated_at timestamptz NOT NULL DEFAULT now()
         )`,
      )
      .then(() => undefined)
      .catch((err) => {
        // On réinitialise pour retenter au prochain appel plutôt que de
        // rester bloqué sur une promesse rejetée.
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}
