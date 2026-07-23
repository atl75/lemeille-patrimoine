# Audit Complet du Site

## 📋 Description

Script d'audit complet qui analyse :
- **Crawling** : Découverte des pages (max 60, profondeur 3)
- **Liens cassés** : Détection des 404 et liens invalides
- **SEO** : Title, meta description, canonical, H1, Open Graph, JSON-LD, images alt
- **Accessibilité** : axe-core sur 20 pages
- **Performance** : Lighthouse mobile & desktop sur 5 pages clés

## 🚀 Utilisation

```bash
# Exécution simple
bash scripts/audit-site.sh

# Personnaliser les paramètres
SITE_URL="https://example.com" MAX_PAGES=30 bash scripts/audit-site.sh
```

##⚙️ Configuration

Variables d'environnement disponibles :

| Variable | Défaut | Description |
|----------|--------|-------------|
| `SITE_URL` | `https://lemeillepatrimoine.com` | URL du site à auditer |
| `MAX_PAGES` | `60` | Nombre max de pages à scanner |
| `MAX_DEPTH` | `3` | Profondeur du crawl |
| `MOBILE_EMULATION` | `true` | Émulation mobile pour axe-core |

## 📦 Dépendances

Installées automatiquement lors du premier lancement :
- `puppeteer` : Navigation headless
- `@axe-core/puppeteer` : Tests d'accessibilité
- `linkinator` : Détection des liens cassés
- `cheerio` : Parsing HTML pour SEO
- `lighthouse` : Audit de performance

## 📊 Résultats

Les rapports sont générés dans le dossier `audit/` :

```
audit/
├── AUDIT-REPORT.md           # Rapport principal (Markdown)
├── pages-sampled.json         # Pages auditées pour perf
├── links/
│   ├── pages.json             # Liste de toutes les pages
│   ├── broken-links.json      # Liens cassés (JSON)
│   └── broken-links.csv       # Liens cassés (CSV)
├── seo/
│   ├── seo-summary.json       # Résumé SEO
│   └── <url>.json             # Détails SEO par page
├── axe/
│   ├── axe-summary.json       # Résumé accessibilité
│   └── <url>.json             # Violations axe par page
└── perf/
    ├── perf-summary.json      # Résumé performance
    ├── <url>-lh-mobile.html   # Rapport Lighthouse mobile
    ├── <url>-lh-desktop.html  # Rapport Lighthouse desktop
    └── <url>-lh-mobile.json   # Données Lighthouse (JSON)
```

## 🎯 Pages testées pour la performance

Le script audite automatiquement 5 pages clés :
1. Page d'accueil
2. `/immobilier`
3. `/programmes`
4. `/patrimoine`
5. `/avis` ou `/contact`

## ⏱️ Temps d'exécution

- Crawl : ~30-60 secondes (selon nombre de pages)
- SEO : ~10 secondes par page
- Accessibilité : ~5-10 secondes par page (20 pages max)
- Performance : ~30-60 secondes par page (5 pages)

**Total estimé** : 5-10 minutes

## 📌 Notes

- Le script est idempotent (peut être relancé sans problème)
- Les rapports précédents sont écrasés
- Nécessite une connexion internet (pour tester le site en production)
- Lighthouse nécessite Chrome/Chromium (installé avec Puppeteer)

## 🔍 Exemple de commandes

```bash
# Audit rapide (10 pages max)
MAX_PAGES=10 bash scripts/audit-site.sh

# Audit en local (développement)
SITE_URL="http://localhost:3000" bash scripts/audit-site.sh

# Voir uniquement les liens cassés
cat audit/links/broken-links.csv
```

## 📝 Rapport Markdown

Le rapport `audit/AUDIT-REPORT.md` contient :
- Résumé exécutif (pages scannées, liens cassés, violations)
- Tableau de performance (Lighthouse mobile & desktop)
- Points SEO critiques
- Améliorations recommandées
- Détails des violations d'accessibilité
- Liste des liens cassés

## 🛠️ Troubleshooting

**Erreur "Chrome not found"** :
- Puppeteer installe automatiquement Chromium
- Si problème, installer Chrome manuellement

**Timeout sur Lighthouse** :
- Augmenter `MAX_DEPTH` pour réduire le nombre de pages
- Vérifier que le site est accessible

**Violations axe faussement positives** :
- Consulter les fichiers JSON détaillés dans `audit/axe/`
- Certaines règles peuvent être désactivées si nécessaire
