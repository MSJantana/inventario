#!/bin/sh
set -e

echo "[entrypoint:prod] Iniciando container backend..."
echo "[entrypoint:prod] NODE_ENV = ${NODE_ENV:-production}"
echo "[entrypoint:prod] SKIP_MIGRATIONS = ${SKIP_MIGRATIONS:-default_prisma_deploy}"

# 1) DATABASE_URL deve vir pronta do ambiente/stack
if [ -z "$DATABASE_URL" ] || printf '%s' "$DATABASE_URL" | grep -q '\${'; then
  echo "[entrypoint:prod] ERRO: DATABASE_URL nao foi definida corretamente. Informe a URL completa no ambiente/stack." >&2
  exit 1
fi
echo "[entrypoint:prod] DATABASE_URL recebida via ambiente."

# 2) PRISMA CLIENT DEFENSIVO: REGENERA SEMPRE no startup, independente do que
#    foi gerado no build. Isso evita erros como "Value 'CHROMEBOOK' not found in
#    enum 'TipoEquipamento'" causados por:
#      - imagem buildada com schema.prisma antigo
#      - bind mount de node_modules desatualizado
#      - cache de camadas do Docker / Portainer
echo "[entrypoint:prod] Regenerando Prisma Client a partir do schema.prisma embutido..."
if npx prisma generate; then
  echo "[entrypoint:prod] Prisma Client regenerado com sucesso."
else
  echo "[entrypoint:prod] AVISO: 'prisma generate' falhou. Tentando utilizar cliente ja existente (build-time)." >&2
fi

# 3) Migrações. Suporta 4 estratégias via SKIP_MIGRATIONS:
#
#    SKIP_MIGRATIONS = true        → não roda NENHUMA migration (use quando DBA aplica manualmente)
#    SKIP_MIGRATIONS = false (padrão) → roda `prisma migrate deploy` (recomendado se o container tem permissão ALTER TABLE)
#    SKIP_MIGRATIONS = RUNTIME_HELPER → roda `node prisma/apply-all-migrations-runtime.mjs`
#                   (ideal para cenários tipo homologação 10.12.3.231 onde
#                    DATABASE_URL é template com placeholders / host separado
#                    e o schema.prisma _prisma_migrations pode estar desalinhado)
#    SKIP_MIGRATIONS = AUTO        → tenta `prisma migrate deploy` primeiro;
#                                     se falhar, cai para RUNTIME_HELPER.
#
case "$SKIP_MIGRATIONS" in
  "true")
    echo "[entrypoint:prod] SKIP_MIGRATIONS=true -> pulando migracões."
    ;;
  "RUNTIME_HELPER"|"runtime_helper"|"RUNTIME")
    echo "[entrypoint:prod] SKIP_MIGRATIONS=RUNTIME_HELPER -> rodando apply-all-migrations-runtime.mjs (host MySQL separado / template env)"
    node prisma/apply-all-migrations-runtime.mjs
    ;;
  "AUTO"|"auto")
    echo "[entrypoint:prod] SKIP_MIGRATIONS=AUTO -> tentando 'prisma migrate deploy' primeiro..."
    if npx prisma migrate deploy; then
      echo "[entrypoint:prod] migrate deploy OK."
    else
      echo "[entrypoint:prod] migrate deploy falhou. Fallback para RUNTIME_HELPER (apply-all-migrations-runtime.mjs)..." >&2
      node prisma/apply-all-migrations-runtime.mjs
    fi
    ;;
  "false"|"")
    echo "[entrypoint:prod] Aplicando migrations do Prisma (prisma migrate deploy)..."
    npx prisma migrate deploy
    ;;
  *)
    echo "[entrypoint:prod] AVISO: SKIP_MIGRATIONS='$SKIP_MIGRATIONS' desconhecido. Comportamento = DEFAULT (prisma migrate deploy)." >&2
    npx prisma migrate deploy
    ;;
esac

# 4) Iniciar aplicação
echo "[entrypoint:prod] Iniciando servidor Node (src/index.js)..."
exec node src/index.js
