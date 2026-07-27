FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts : le postinstall (scripts/postinstall.js) ne fait que
# créer les dossiers data/ & public/uploads, gérés directement dans le
# stage runner. Le fichier scripts/ n'est pas encore copié à ce stade.
RUN npm ci --ignore-scripts

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
# node_modules de PRODUCTION uniquement : exclut les outils de dev/audit
# (eslint, lighthouse, puppeteer, drizzle-kit…) → image plus légère et
# débarrassée des dépendances de dev signalées par npm audit.
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/next.config.js ./next.config.js
# lib/ contient le loader d'images personnalisé (cloudinaryLoader.js) que
# next.config.js référence via images.loaderFile ; Next.js le lit au
# démarrage du serveur (build non-standalone), il doit donc être présent.
COPY --from=builder /app/lib ./lib

# En production, les données sont stockées dans PostgreSQL (voir lib/db.ts,
# variable DATABASE_URL) : partagées entre toutes les instances, durables aux
# redéploiements. Le dossier data/ local ne sert plus que de repli (dev ou
# absence de DATABASE_URL) et de source de seed au premier démarrage.
RUN mkdir -p data public/uploads && chown -R nextjs:nodejs data public/uploads

USER nextjs

ENV PORT=8080
EXPOSE 8080

CMD ["node", "scripts/start.js"]
