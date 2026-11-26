#!/bin/bash
#
# Entrypoint do container de backup
# Inicializa o cron e mantém o container rodando
#

set -e

# Carregar variáveis de ambiente do .env se existir
if [ -f /app/.env.backup ]; then
    set -a
    . /app/.env.backup
    set +a
fi

# Criar diretórios necessários
mkdir -p /backup/inventario /var/log/backup

# Escrever o arquivo crontab
cat > /etc/cron.d/backup-cron << EOF
0 2 * * * root /app/backup.sh >> /var/log/backup/cron.log 2>&1
EOF

chmod 0644 /etc/cron.d/backup-cron
crontab /etc/cron.d/backup-cron

# Inicializar o cron
service cron start

# Manter o container rodando
echo "Container de backup iniciado. Cron agendado para executar diariamente às 02:00."
tail -f /var/log/backup/cron.log 2>/dev/null || tail -f /dev/null
