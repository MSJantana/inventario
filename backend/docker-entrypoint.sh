#!/bin/sh
set -e

echo "[entrypoint] Aplicando migrations do Prisma..."
npx prisma migrate deploy

echo "[entrypoint] Iniciando servidor Node..."
exec node src/index.js