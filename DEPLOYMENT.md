# Lemeille Patrimoine — Guide de déploiement (Google Cloud Run)

## Stockage des données : PostgreSQL partagé (recommandé)

Le site enregistre ses données (biens, leads, programmes, avis, articles) via
`lib/utils.ts`. Deux modes de stockage existent :

- **Avec `DATABASE_URL` (recommandé)** : les données sont stockées dans une base
  **PostgreSQL** partagée (table `data_store`, voir `lib/db.ts`). Toutes les
  instances Cloud Run — et donc tous les appareils/ordinateurs de l'admin — lisent
  et écrivent la **même** source. Rien n'est perdu au redéploiement ni au
  scale-to-zero. C'est ce mode qui corrige le problème « je n'ai pas les mêmes
  données d'un ordinateur à l'autre ».
- **Sans `DATABASE_URL`** : repli sur des fichiers JSON locaux (`data/*.json`).
  Pratique en développement, mais sur une plateforme multi-instances comme Cloud
  Run, **chaque instance a son propre disque** : les saisies faites depuis un
  appareil ne sont pas visibles depuis un autre, et un redéploiement efface tout.
  À n'utiliser qu'en local.

Le reste de ce guide déploie sur **Cloud Run** (conteneur Node) avec une base
**Cloud SQL for PostgreSQL**.

## 1. Pousser le code sur GitHub

```bash
# Sur github.com : créer un dépôt vide (sans README ni .gitignore)
git remote add origin https://github.com/<ton-compte>/lemeille-patrimoine.git
git push -u origin main
```

## 2. Installer et configurer gcloud CLI

1. Installer le CLI : https://cloud.google.com/sdk/docs/install
2. S'authentifier et créer/sélectionner un projet :
   ```bash
   gcloud init
   gcloud auth login
   ```
3. Activer la facturation sur le projet dans la console GCP (obligatoire pour Cloud Run
   et Cloud Storage — au-delà du palier gratuit généreux, la facturation ne se déclenche
   que si le trafic devient important).
4. Activer les API nécessaires :
   ```bash
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com sqladmin.googleapis.com
   ```

## 3. Créer la base PostgreSQL (Cloud SQL)

```bash
# Instance PostgreSQL (db-f1-micro suffit largement pour ce site)
gcloud sql instances create lemeille-pg \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=europe-west1

# Base et utilisateur applicatifs
gcloud sql databases create lemeille --instance=lemeille-pg
gcloud sql users create lemeille --instance=lemeille-pg --password='<mot-de-passe-db>'

# Récupérer le « connection name » (format PROJET:REGION:INSTANCE)
gcloud sql instances describe lemeille-pg --format='value(connectionName)'
```

La table `data_store` est créée automatiquement au premier démarrage de
l'application (`lib/db.ts`) ; aucune migration SQL manuelle n'est nécessaire.

La chaîne de connexion à utiliser depuis Cloud Run (via socket Cloud SQL) :

```
postgres://lemeille:<mot-de-passe-db>@/lemeille?host=/cloudsql/<CONNECTION_NAME>
```

## 3 bis. (Optionnel) Importer les données existantes

Les données de seed livrées dans le dépôt (programmes, avis, articles) se chargent
toutes seules au premier démarrage. Si tu as déjà des **biens/leads réels** saisis
sur l'ancien stockage, importe-les une fois dans la base :

```bash
# Depuis ta machine, avec le proxy Cloud SQL en marche (ou une IP publique
# autorisée), et le dossier data/ contenant les données réelles à importer :
DATABASE_URL="postgres://lemeille:<mdp>@localhost:5432/lemeille" \
  npm run db:import          # ajoute --force pour écraser une clé déjà en base
```

Voir `scripts/migrate-json-to-db.mjs` pour les options (`--dir=`, `--force`).

## 4. Déployer sur Cloud Run

```bash
gcloud run deploy lemeille-patrimoine \
  --source . \
  --region=europe-west1 \
  --allow-unauthenticated \
  --concurrency=80 \
  --add-cloudsql-instances=<CONNECTION_NAME> \
  --set-env-vars="DATABASE_URL=postgres://lemeille:<mot-de-passe-db>@/lemeille?host=/cloudsql/<CONNECTION_NAME>" \
  --set-env-vars="NEXT_PUBLIC_SITE_URL=https://lemeillepatrimoine.com" \
  --set-env-vars="ADMIN_PASSWORD=<mot-de-passe-admin>" \
  --set-env-vars="ANTHROPIC_API_KEY=<clé>" \
  --set-env-vars="CLOUDINARY_CLOUD_NAME=<valeur>" \
  --set-env-vars="CLOUDINARY_API_KEY=<valeur>" \
  --set-env-vars="CLOUDINARY_API_SECRET=<valeur>" \
  --set-env-vars="RESEND_API_KEY=<valeur>" \
  --set-env-vars="NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<valeur>" \
  --set-env-vars="GOOGLE_PLACES_API_KEY=<valeur>" \
  --set-env-vars="GOOGLE_PLACE_ID=<valeur>" \
  --set-env-vars="NEXT_PUBLIC_GA_MEASUREMENT_ID=<valeur>"
```

Notes :
- La base PostgreSQL étant partagée, plusieurs instances peuvent tourner sans risque :
  plus besoin de limiter à `--max-instances=1` ni de monter un volume Cloud Storage.
- `--add-cloudsql-instances` rend la base accessible via le socket
  `/cloudsql/<CONNECTION_NAME>` référencé dans `DATABASE_URL` (pas de SSL requis
  sur ce socket — `lib/db.ts` le détecte automatiquement).
- Remplace les `<...>` par tes vraies valeurs, ou omets les variables optionnelles
  (Google Maps, Places, Resend, GA) si tu ne les utilises pas encore — voir
  `.env.example` pour le détail de chaque clé.
- Cette première commande construit l'image via Cloud Build depuis le Dockerfile du
  dépôt (`--source .`) : pas besoin de builder/pousser l'image toi-même.
- **Attention** : sans `DATABASE_URL`, le site retombe sur les fichiers JSON locaux
  et le problème de désynchronisation entre appareils réapparaît.

Cloud Run renvoie une URL du type `https://lemeille-patrimoine-xxxxx.a.run.app` —
vérifie que le site fonctionne dessus avant de brancher le domaine.

## 5. Brancher le nom de domaine

```bash
gcloud run domain-mappings create \
  --service=lemeille-patrimoine \
  --domain=lemeillepatrimoine.com \
  --region=europe-west1
```

Cette commande affiche les enregistrements DNS à créer (des `A`/`AAAA` ou un `CNAME`
selon le cas). Va ensuite sur l'interface où ton domaine est géré (Google
Workspace/Domains, ou Squarespace si le transfert a eu lieu) et ajoute **uniquement**
ces enregistrements.

**Important** : ne touche à aucun enregistrement `MX`, ni aux `TXT`/`CNAME` liés à
Google Workspace (vérification de domaine, DKIM, etc.) — ce sont eux qui font
fonctionner ta messagerie professionnelle. N'ajoute/modifie que les enregistrements
que la commande ci-dessus t'indique pour le site web.

Répète l'opération pour `www.lemeillepatrimoine.com` si tu veux que les deux
fonctionnent (le `next.config.js` redirige déjà `www` vers le domaine nu).

## Variables d'environnement

Voir `.env.example` pour la liste complète et à quoi sert chaque clé. Seul
`ADMIN_PASSWORD` est strictement obligatoire pour que le site démarre correctement
(sans lui, la connexion `/admin/login` ne fonctionne pas) ; les autres activent des
fonctionnalités optionnelles (chat IA, upload de photos, emails, cartes, avis Google).

## Test en local du build de production

```bash
npm run build
node scripts/start.js
```

Le serveur démarre sur `http://0.0.0.0:3000` (ou la valeur de `PORT`).

## Logs et supervision

```bash
gcloud run services logs read lemeille-patrimoine --region=europe-west1
```

Ou directement dans la console Cloud Run (Google Cloud Console → Cloud Run →
lemeille-patrimoine → Logs).
