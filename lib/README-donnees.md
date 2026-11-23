# Contrat de la couche de données

Les routes utilisent `readJSON` et `updateJSON` de `utils.ts`. Les collections de production sont dans Cloud Storage ; une configuration GCS déclarée ne permet jamais de repli silencieux vers le disque. Les fichiers locaux sont réservés au développement et aux recettes isolées.

## Lectures et absence

- Le cache GCS dure trois secondes ; `{ fresh: true }` le contourne. Une copie protège son contenu des mutations du lecteur.
- Corruption, refus et panne sont des erreurs, pas des listes vides.
- `missingCollection.ts` protège cinq collections préalablement inventoriées : prospects, mandats, biens, programmes et articles. Leur absence bloque lecture et mutation avec le code `COLLECTION_ABSENTE`. Un tableau vide réellement présent reste valide.
- Une absence GCS constatée invalide le cache. Un cache non expiré peut toutefois différer sa détection jusqu’à la prochaine lecture fraîche. Les mutations lisent toujours la génération courante.
- Les collections auxiliaires conservent leur initialisation historique. Étendre la protection seulement après inventaire et préparation du premier provisionnement. Ne jamais remplacer une collection manquante par `[]` pour faire disparaître une erreur.

## Écritures

`updateJSON(file, mutate)` sérialise les écritures locales et utilise une précondition de génération GCS entre instances. Le callback peut être rejoué après conflit : il ne doit ni envoyer d’email ni modifier une autre collection. Les effets externes suivent la sauvegarde confirmée. Une opération multi-collections n’est pas une transaction.

Renvoyer `SANS_ECRITURE` si rien ne doit être modifié. Ne pas appeler `writeJSON` pour remplacer une collection : le garde-fou de build l’interdit ; seul le fichier OAuth dispose d’une exception précise. Une réponse réseau perdue ne déclenche pas un rejeu automatique des écritures.

## Incident et reprise

En cas de collection protégée absente, conserver l’erreur et arrêter les écritures concernées. Examiner les métadonnées et l’historique, identifier une sauvegarde cohérente, la restaurer et la contrôler dans un environnement isolé avant toute intervention en production. Ne pas effacer les objets ou versions restants. La procédure complète chronométrée et les alertes restent à établir (DT-03/16).

Après restauration d’un fichier valide, une nouvelle requête peut reprendre sans redémarrage. La validation des liens et invariants entre collections reste nécessaire. Ce contrat n’est ni une sauvegarde ni une preuve de restauration réelle.

## Tests

`npm test` utilise des transports fictifs pour GCS et des répertoires temporaires pour les fichiers. `NODE_TEST_CONTEXT`, `NODE_ENV=test` et `LP_SANS_GCS=1` empêchent l’adaptateur réel de contacter GCS. Les tests HTTP s’exécutent sur une copie avec des fixtures, sans `.env` ni données clients. Ne jamais injecter une suppression ou une panne sur le bucket de production pour tester le garde-fou.
