# Gunakan image Node.js yang ringan
FROM node:20-alpine AS base

# Install dependensi yang dibutuhkan untuk Prisma (openssl, libc6-compat)
RUN apk add --no-cache openssl libc6-compat

# --- Stage 1: Build ---
FROM base AS builder
WORKDIR /app

# Salin package.json dan package-lock.json
COPY package*.json ./
COPY prisma ./prisma/

# Install semua dependencies (termasuk devDependencies untuk build/generate prisma)
RUN npm ci

# Salin seluruh sisa source code
COPY . .

# Generate Prisma Client & Build TypeScript ke JavaScript (jika ada script build)
RUN npx prisma generate
RUN npm run build

# --- Stage 2: Production Image ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Salin file yang dibutuhkan dari builder
COPY package*.json ./
COPY prisma ./prisma/

# Install hanya dependencies untuk production
RUN npm ci --only=production && npx prisma generate

# Salin hasil build dari stage builder (sesuaikan dengan output folder tsconfig, misal dist/)
COPY --from=builder /app/dist ./dist

# Salin aset demo yang dibutuhkan oleh demo-seed (foto profil, pdf materi, dsb)
COPY --from=builder /app/seed-assets ./seed-assets

# Port yang digunakan API
EXPOSE 5000

# Jalankan server
CMD ["npm", "run", "start"]