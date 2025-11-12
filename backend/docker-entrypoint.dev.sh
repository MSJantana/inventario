#!/bin/sh
set -e

echo "[entrypoint:dev] Prisma Client foi gerado no build."
echo "[entrypoint:dev] Sincronizando schema com o banco (prisma db push)..."
npx prisma db push

echo "[entrypoint:dev] Iniciando servidor Node..."
exec node src/index.js
