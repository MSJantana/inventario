#!/bin/sh
set -e

# DATABASE_URL deve vir pronta do ambiente/stack
if [ -z "$DATABASE_URL" ] || printf '%s' "$DATABASE_URL" | grep -q '\${'; then
  echo "[entrypoint:prod] ERRO: DATABASE_URL nao foi definida corretamente. Informe a URL completa no ambiente/stack." >&2
  exit 1
fi

echo "[entrypoint:prod] DATABASE_URL recebida via ambiente."

# Migrações (pode pular com SKIP_MIGRATIONS=true)
if [ "$SKIP_MIGRATIONS" = "true" ]; then
  echo "[entrypoint:prod] SKIP_MIGRATIONS=true -> pulando 'prisma migrate deploy'."
else
  echo "[entrypoint:prod] Aplicando migrations do Prisma (migrate deploy)..."
  npx -y prisma migrate deploy
fi

echo "[entrypoint:prod] Iniciando servidor Node..."
exec node src/index.js
