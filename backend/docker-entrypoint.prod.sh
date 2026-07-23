#!/bin/sh
set -e

# Monta DATABASE_URL se não vier pronta ou vier com placeholders do .env
case "$DATABASE_URL" in
  ""|*'${'*)
    DB_USER_VALUE="${DB_USER:-${DATABASE_USER:-}}"
    DB_PASSWORD_VALUE="${DB_PASSWORD:-${DATABASE_PASSWORD:-}}"
    DB_NAME_VALUE="${DB_NAME:-${DATABASE_NAME:-}}"
    DB_HOST_VALUE="${DB_HOST:-${DATABASE_HOST:-db}}"
    DB_PORT_VALUE="${DB_PORT:-${DATABASE_PORT:-${MYSQL_PORT:-3306}}}"

    if [ -z "$DB_USER_VALUE" ] || [ -z "$DB_PASSWORD_VALUE" ] || [ -z "$DB_NAME_VALUE" ]; then
      echo "[entrypoint:prod] ERRO: DATABASE_URL não foi definida e faltam variáveis para montar (DB_USER/DATABASE_USER, DB_PASSWORD/DATABASE_PASSWORD, DB_NAME/DATABASE_NAME)." >&2
      exit 1
    fi

    export DB_USER_VALUE DB_PASSWORD_VALUE DB_NAME_VALUE DB_HOST_VALUE DB_PORT_VALUE
    export DATABASE_URL="$(node -e "const user = process.env.DB_USER_VALUE || ''; const password = process.env.DB_PASSWORD_VALUE || ''; const database = process.env.DB_NAME_VALUE || ''; const host = process.env.DB_HOST_VALUE || 'db'; const port = process.env.DB_PORT_VALUE || '3306'; const encode = encodeURIComponent; process.stdout.write('mysql://' + encode(user) + ':' + encode(password) + '@' + host + ':' + port + '/' + encode(database));")"

    echo "[entrypoint:prod] DATABASE_URL construída: mysql://${DB_USER_VALUE}:***@${DB_HOST_VALUE}:${DB_PORT_VALUE}/${DB_NAME_VALUE}"
    ;;
  *)
    echo "[entrypoint:prod] DATABASE_URL recebida via ambiente."
    ;;
fi

# Migrações (pode pular com SKIP_MIGRATIONS=true)
if [ "$SKIP_MIGRATIONS" = "true" ]; then
  echo "[entrypoint:prod] SKIP_MIGRATIONS=true -> pulando 'prisma migrate deploy'."
else
  echo "[entrypoint:prod] Aplicando migrations do Prisma (migrate deploy)..."
  npx -y prisma migrate deploy
fi

echo "[entrypoint:prod] Iniciando servidor Node..."
exec node src/index.js
