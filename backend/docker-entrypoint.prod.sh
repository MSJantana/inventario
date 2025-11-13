#!/bin/sh
set -e

# Monta DATABASE_URL se não vier pronta
if [ -z "$DATABASE_URL" ]; then
  DB_HOST="${DATABASE_HOST:-db}"
  DB_PORT="${DATABASE_PORT:-3306}"
  if [ -z "$DATABASE_USER" ] || [ -z "$DATABASE_PASSWORD" ] || [ -z "$DATABASE_NAME" ]; then
    echo "[entrypoint:prod] ERRO: DATABASE_URL não foi definida e faltam variáveis para montar (DATABASE_USER/PASSWORD/NAME)." >&2
    exit 1
  fi
  export DATABASE_URL="mysql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DB_HOST}:${DB_PORT}/${DATABASE_NAME}"
  echo "[entrypoint:prod] DATABASE_URL construída: mysql://${DATABASE_USER}:***@${DB_HOST}:${DB_PORT}/${DATABASE_NAME}"
fi

echo "[entrypoint:prod] Aplicando migrations do Prisma (migrate deploy)..."
npx prisma migrate deploy

echo "[entrypoint:prod] Iniciando servidor Node..."
exec node src/index.js
