# 🚀 Configuration PageSpeed Insights (PSI)

## 📋 Pourquoi utiliser PSI ?

PageSpeed Insights donne des **scores officiels Google** utilisés pour le référencement, avec des données réelles de vrais utilisateurs (Core Web Vitals).

**Différences PSI vs Lighthouse local :**
- ✅ **PSI** : Scores officiels, données terrain (CrUX), utilisé pour le SEO
- ✅ **Lighthouse** : Résultats identiques algorithmiquement, illimité, déjà fonctionnel

---

## 🔑 Étape 1 : Obtenir une clé API Google (GRATUIT)

### 1. Créer un projet Google Cloud
1. Allez sur https://console.cloud.google.com/
2. Connectez-vous avec votre compte Google
3. Cliquez sur "Select a project" → "New Project"
4. Nom du projet : `Lemeille-Patrimoine-Audit`
5. Cliquez sur "Create"

### 2. Activer l'API PageSpeed Insights
1. Dans le menu ☰, allez dans **APIs & Services** → **Library**
2. Recherchez `PageSpeed Insights API`
3. Cliquez sur le résultat
4. Cliquez sur **Enable** (activer)

### 3. Créer une clé API
1. Dans le menu ☰, allez dans **APIs & Services** → **Credentials**
2. Cliquez sur **+ CREATE CREDENTIALS** → **API key**
3. Une fenêtre s'ouvre avec votre clé (format : `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)
4. **Copiez cette clé** (vous en aurez besoin à l'étape suivante)

### 4. Sécuriser la clé (optionnel mais recommandé)
1. Dans la fenêtre de la clé, cliquez sur **Restrict Key**
2. Sous "API restrictions", sélectionnez "Restrict key"
3. Cochez uniquement **PageSpeed Insights API**
4. Cliquez sur **Save**

---

## 🔐 Étape 2 : Ajouter la clé dans Replit

### Méthode 1 : Via l'interface Replit (recommandé)
1. Dans Replit, ouvrez l'onglet **Secrets** (🔐 dans la barre latérale gauche)
2. Cliquez sur **+ New Secret**
3. **Key** : `PSI_API_KEY`
4. **Value** : Collez votre clé API (celle copiée à l'étape 1.3)
5. Cliquez sur **Add Secret**

### Méthode 2 : Via la ligne de commande
```bash
# Ouvrir le Shell Replit et exécuter :
export PSI_API_KEY="VOTRE_VRAIE_CLE_API"
```
⚠️ **Attention** : Cette méthode est temporaire (perdue au redémarrage). Préférez la Méthode 1.

---

## ⚡ Étape 3 : Lancer l'audit avec PSI

### Commandes à exécuter

```bash
# 1) Lancer l'audit complet (5-10 minutes)
bash scripts/audit-site.sh

# 2) Analyser les résultats
node scripts/analyze-audit.mjs audit

# 3) Consulter le rapport
cat audit/summary/AUDIT-SUMMARY.md
```

### Exemple de sortie avec PSI

```
==== ✅ RÉSUMÉ AUDIT ====
📄 Pages scannées : 60
🔗 Liens cassés : 2
♿ Violations accessibilité : 39
⚡ Mode performance : PSI

## Performance (PageSpeed Insights)
| URL | Perf M | SEO M | A11y M | Perf D | SEO D | A11y D |
|---|---:|---:|---:|---:|---:|---:|
| https://lemeillepatrimoine.com | 98 | 100 | 100 | 100 | 100 | 100 |
| https://lemeillepatrimoine.com/immobilier | 95 | 100 | 98 | 100 | 100 | 100 |
```

---

## 📊 Que faire après l'audit ?

### 1. Consulter les rapports détaillés
```bash
# Résumé exécutif
cat audit/summary/AUDIT-SUMMARY.md

# Liste de tâches priorisées (CSV)
open audit/summary/AUDIT-TASKS.csv

# Rapport complet
cat audit/AUDIT-REPORT.md
```

### 2. Rapports Lighthouse HTML
- Desktop : `audit/perf/https%3A%2F%2Flemeillepatrimoine.com-lh-desktop.report.html`
- Mobile : `audit/perf/https%3A%2F%2Flemeillepatrimoine.com-lh-mobile.report.html`

### 3. Données JSON (pour analyse programmatique)
- `audit/summary/audit-digest.json` : Résumé machine-readable
- `audit/seo/seo-summary.json` : Détails SEO
- `audit/axe/axe-summary.json` : Violations accessibilité

---

## 🔄 Relancer régulièrement

### Planification recommandée
- **Avant chaque déploiement** : Vérifier que tout est OK
- **Hebdomadaire** : Surveiller les Core Web Vitals
- **Après optimisations** : Mesurer l'impact

### Commande rapide
```bash
# Tout-en-un
bash scripts/audit-site.sh && node scripts/analyze-audit.mjs audit
```

---

## ⚠️ Quotas API Google

PageSpeed Insights gratuit :
- **25 000 requêtes/jour** (largement suffisant)
- Notre audit utilise **10 requêtes** (5 pages × 2 modes)
- Vous pouvez auditer **2500 fois par jour** 🚀

Si quota dépassé :
- Le script basculera automatiquement sur **Lighthouse local**
- Aucune interruption, résultats quasi-identiques

---

## 🆘 Troubleshooting

### Erreur : "API key not valid"
→ Vérifiez que vous avez bien activé **PageSpeed Insights API** (Étape 1.2)

### Erreur : "Quota exceeded"
→ Attendez 24h ou basculez sur Lighthouse (script le fait automatiquement)

### Aucun changement dans les résultats
→ Vérifiez que `PSI_API_KEY` est bien défini :
```bash
echo $PSI_API_KEY  # Doit afficher votre clé
```

### Script utilise Lighthouse au lieu de PSI
→ La variable n'est pas définie. Ajoutez-la dans Secrets Replit (Étape 2.1)

---

## 📚 Ressources

- [Documentation PSI](https://developers.google.com/speed/docs/insights/v5/get-started)
- [Core Web Vitals](https://web.dev/vitals/)
- [Lighthouse scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)

---

**Prêt à lancer l'audit avec PSI ?**
1. Obtenez votre clé API (Étape 1)
2. Ajoutez-la dans Secrets (Étape 2)
3. Lancez `bash scripts/audit-site.sh`
