# Backend Dockerfile (Node + Express + Prisma)
FROM node:20-alpine AS runtime

WORKDIR /app

# Mantém a imagem leve e compatível com Prisma e healthcheck
RUN apk add --no-cache openssl curl

# Instalar dependências (apenas prod)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copiar Prisma schema e gerar client
COPY prisma ./prisma
RUN npx prisma generate

# Copiar código fonte
COPY src ./src

# Entrypoint para migrations + start
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Porta padrão do backend
ENV PORT=3002
EXPOSE 3002

# Healthcheck por HTTP
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD curl -fsS http://localhost:3002/api/health || exit 1

# Entrypoint
ENTRYPOINT ["/app/docker-entrypoint.sh"]