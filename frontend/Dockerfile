# Frontend Dockerfile (Vite build + Nginx)

# Stage 1: build
FROM node:20-alpine AS build
WORKDIR /app

ENV NODE_ENV=production

# Permitir configurar a API base em tempo de build do Vite
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Gerar arquivos pré-comprimidos (gzip e brotli) para assets
RUN apk add --no-cache brotli && \
    find dist -type f -regextype posix-extended -regex ".*\.(js|css|html|svg)$" -exec gzip -k -9 {} \; -exec brotli -k -q 11 {} \;

# Stage 2: serve static with Nginx
FROM fholzer/nginx-brotli:latest AS serve

# Copiar artefatos do build
COPY --from=build /app/dist /usr/share/nginx/html

# Configuração Nginx para SPA (fallback para index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]