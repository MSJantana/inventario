# ---- build ----
    FROM node:20-alpine AS build
    WORKDIR /app
    
    # ⚠️ Não defina NODE_ENV=production aqui: precisamos das devDependencies (tsc, vite)
    ARG VITE_API_BASE_URL
    ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
    
    COPY package*.json ./
    RUN npm ci
    
    COPY . .
    RUN npm run build
    
    # Pré-compressão (brotli + gzip)
    # - usamos findutils (GNU find) pois o busybox find não tem -regextype
    RUN apk add --no-cache brotli findutils gzip \
     && find dist -type f -regextype posix-extended -regex '.*\.(js|css|html|svg)$' \
          -exec gzip -k -9 {} \; \
          -exec brotli -k -q 11 {} \;
    
    # ---- serve ----
    FROM fholzer/nginx-brotli:latest AS serve
    ENV NODE_ENV=production
    
    # artefatos estáticos
    COPY --from=build /app/dist /usr/share/nginx/html
    
    # Configuração do Nginx (SPA + estáticos pré-comprimidos)
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]
    