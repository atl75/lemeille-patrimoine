# Lemeille Patrimoine — Next.js (Vercel ready)

## Démarrage
1) `npm install`
2) `npm run seed`
3) `npm run dev` (local) ou `npm run build && npm start` (prod)

## Variables d’environnement (Vercel)
- `ADMIN_PASSWORD` (obligatoire)
- `NEXT_PUBLIC_SITE_URL` (ex: https://lemeillepatrimoine.com)

## Admin
- `/admin/login` puis gestion des contenus
- Propriétés: DPE + PDF + galerie + carte (EXACT/AREA)

## SEO
- `lib/seo.ts` + `lib/schema.ts` (Novus Capital SIREN 937 847 937, adresses Rouen & Saint-Aygulf)

## Données
- JSON dans `/data/*.json` (seed disponible)
