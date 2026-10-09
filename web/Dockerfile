# Gunakan image Node.js yang ringan
FROM node:20-alpine AS base

# --- Stage 1: Install dependencies ---
FROM base AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

# --- Stage 2: Build code ---
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_API_BASE_URL
ARG API_PROXY_TARGET

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV API_PROXY_TARGET=$API_PROXY_TARGET

# Build aplikasi Next.js (next.config.ts memakai `output: 'standalone'`,
# jadi hasilnya ada di .next/standalone + .next/static terpisah)
RUN npm run build

# --- Stage 3: Production runner ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Server standalone minimal (sudah termasuk node_modules yang dibutuhkan)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Aset statis Next.js (/_next/static/*) — wajib disalin manual saat output=standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# File di public/ (hero-learnly.jpg, logo-learnly.png, icons/*.png, dsb.) — juga wajib manual
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Server standalone Next.js (bukan `next start`) — lihat docs/output.md
CMD ["node", "server.js"]
