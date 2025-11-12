#!/bin/sh
set -e

echo "[entrypoint:prod] Aplicando migrations do Prisma (migrate deploy)..."
npx prisma migrate deploy

echo "[entrypoint:prod] Iniciando servidor Node..."
exec node src/index.js
