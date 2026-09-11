# Backend Dockerfile (Node + Express + Prisma)
FROM node:20-alpine AS runtime
WORKDIR /app

# Dependências de runtime necessárias pelo Prisma & healthcheck
RUN apk add --no-cache openssl curl

# Instalar deps de produção
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Schema Prisma + migrations + scripts runtime helpers
COPY prisma ./prisma
ARG DATABASE_URL="mysql://root:password@localhost:3306/inventario"
ENV DATABASE_URL=${DATABASE_URL}
RUN npx prisma generate

# Código fonte
COPY src ./src
COPY assets ./assets

# Arquivos de configuração de ambientes suportados (caso runtime os utilize)
COPY .dockerignore* .dockerignore* ./
COPY .env* .env.* ./ || true

# Entrypoint: regenera Prisma Client no startup (defensivo) e aplica migrations
COPY docker-entrypoint.prod.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Porta/healthcheck
ENV PORT=3002
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD curl -fsS http://localhost:3002/api/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
