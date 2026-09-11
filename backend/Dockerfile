# Backend Dockerfile (Node + Express + Prisma)
FROM node:20-alpine AS runtime
WORKDIR /app

# Dependências de runtime necessárias pelo Prisma & healthcheck
RUN apk add --no-cache openssl curl

# 1) Schema Prisma e package manifests COPIADOS ANTES do npm install:
#    - package.json/postinstall contém "prisma generate"
#    - o prisma generate precisa de schema.prisma no ./prisma/ (WORKDIR /app)
#    SEM essa ordem, postinstall falha com "Could not find prisma schema"
COPY package.json package-lock.json ./
COPY prisma ./prisma

# 2) Instala deps (--omit=dev → sem nodemon etc)
#    Usa npm install ao invés de npm ci para:
#     - ser resiliente a pequenas diffs package.json <-> lock (lockfileVersion)
#     --no-audit --no-fund reduz ruído e acelera
RUN npm install --omit=dev --no-audit --no-fund --prefer-offline

# 3) Prisma Client: gera DUAS vezes para ser resiliente.
#    Primeira vez: postinstall fez generate durante npm install
#    Segunda vez: reexecução explícita para garantir cliente atualizado contra schema embutido
ARG DATABASE_URL="mysql://root:password@localhost:3306/inventario"
ENV DATABASE_URL=${DATABASE_URL}
RUN npx prisma generate

# 4) Código fonte + assets (imagens/relatórios)
COPY src ./src
COPY assets ./assets

# 5) Entrypoint: regenera Prisma Client no startup (defensivo) e aplica migrations
COPY docker-entrypoint.prod.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Porta/healthcheck
ENV PORT=3002
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD curl -fsS http://localhost:3002/api/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
