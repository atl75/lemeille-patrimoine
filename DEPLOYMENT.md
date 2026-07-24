# Lemeille Patrimoine — Guide de déploiement (Google Cloud Run)

## Pourquoi Cloud Run et pas Vercel

Le site stocke ses données (biens, leads, programmes, avis, articles) dans de simples
fichiers JSON sur disque (`data/*.json`, via `lib/utils.ts`). Ça fonctionne très bien
sur un serveur qui tourne en continu, mais **pas** sur une plateforme serverless comme
Vercel (disque en lecture seule en production). Cloud Run exécute un conteneur Node
persistant, donc aucune réécriture du code n'est nécessaire.

**Point d'attention réel** : par défaut, le disque d'un conteneur Cloud Run n'est
durable que le temps de vie de l'instance — un redéploiement ou un scale-to-zero
efface tout. Pour éviter de perdre des leads, ce guide monte le dossier `data/` sur
un bucket **Cloud Storage** via un volume Cloud Run (FUSE) : le code ne change pas,
les données survivent aux redéploiements.

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
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com storage.googleapis.com
   ```

## 3. Créer le stockage persistant pour `data/`

```bash
# Nom de bucket unique dans tout GCS
gcloud storage buckets create gs://lemeille-patrimoine-data --location=europe-west1

# Envoyer les fichiers de données actuels (contenu réel : programmes, avis, articles)
gcloud storage cp data/programs.json data/reviews.json data/articles.json \
  gs://lemeille-patrimoine-data/

# Fichiers vides pour les leads/biens (générés au fil de l'eau par le site)
echo '[]' > /tmp/empty.json
gcloud storage cp /tmp/empty.json gs://lemeille-patrimoine-data/leads.json
gcloud storage cp /tmp/empty.json gs://lemeille-patrimoine-data/properties.json
```

## 4. Déployer sur Cloud Run

```bash
gcloud run deploy lemeille-patrimoine \
  --source . \
  --region=europe-west1 \
  --execution-environment=gen2 \
  --allow-unauthenticated \
  --concurrency=80 \
  --max-instances=1 \
  --add-volume=name=data-volume,type=cloud-storage,bucket=lemeille-patrimoine-data \
  --add-volume-mount=volume=data-volume,mount-path=/app/data \
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
- `--max-instances=1` évite que deux instances écrivent `data/*.json` en même temps
  (le site actuel n'a pas besoin de plus d'une instance pour son volume de trafic).
- `--execution-environment=gen2` est requis pour les volumes Cloud Storage.
- Remplace les `<...>` par tes vraies valeurs, ou omets les variables optionnelles
  (Google Maps, Places, Resend, GA) si tu ne les utilises pas encore — voir
  `.env.example` pour le détail de chaque clé.
- Cette première commande construit l'image via Cloud Build depuis le Dockerfile du
  dépôt (`--source .`) : pas besoin de builder/pousser l'image toi-même.

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
