#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Vérification de la clé PSI_API_KEY..."

if [ -z "${PSI_API_KEY:-}" ]; then
  echo ""
  echo "❌ ERREUR : La clé PSI_API_KEY n'est pas définie"
  echo ""
  echo "📋 Pour utiliser PageSpeed Insights :"
  echo "   1. Lisez le guide : scripts/SETUP-PSI.md"
  echo "   2. Obtenez une clé API Google (gratuit)"
  echo "   3. Ajoutez-la dans Secrets Replit"
  echo ""
  echo "💡 Alternative : Le script utilise Lighthouse (déjà fonctionnel)"
  echo "   → Lancez : bash scripts/audit-site.sh"
  echo ""
  exit 1
fi

echo "✅ Clé PSI trouvée : ${PSI_API_KEY:0:12}..."
echo ""
echo "🚀 Lancement de l'audit avec PageSpeed Insights..."
echo "   (Cela peut prendre 10-15 minutes)"
echo ""

# Lance l'audit
bash scripts/audit-site.sh

echo ""
echo "📊 Génération du rapport d'analyse..."
node scripts/analyze-audit.mjs audit

echo ""
echo "✅ Audit PSI terminé !"
echo ""
echo "📄 Rapports disponibles :"
echo "   → audit/summary/AUDIT-SUMMARY.md"
echo "   → audit/summary/AUDIT-TASKS.csv"
echo "   → audit/AUDIT-REPORT.md"
echo ""
