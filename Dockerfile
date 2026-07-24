FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

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
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/next.config.js ./next.config.js

# data/ est destiné à être un volume monté (Cloud Storage FUSE en
# production) pour survivre aux redéploiements et au scaling ; ce
# dossier local sert de repli si aucun volume n'est monté.
RUN mkdir -p data public/uploads && chown -R nextjs:nodejs data public/uploads

USER nextjs

ENV PORT=8080
EXPOSE 8080

CMD ["node", "scripts/start.js"]
