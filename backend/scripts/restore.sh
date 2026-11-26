#!/bin/bash
#
# Script de restauração do banco de dados MySQL - Sistema de Inventário
# Restaura um dump .sql.gz para o banco de dados alvo.
#

set -e

# ============================================================================
# CONFIGURAÇÕES
# ============================================================================
MYSQL_HOST="${MYSQL_HOST:-10.12.0.9}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-inventario_app}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"
MYSQL_DATABASE="${MYSQL_DATABASE:-inventario}"

# ============================================================================
# FUNÇÕES
# ============================================================================

log() {
    local level="$1"
    local message="$2"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}"
}

usage() {
    echo "Uso: $0 <arquivo_backup.sql.gz>"
    echo ""
    echo "Exemplo: $0 inventario-2026-11-25.sql.gz"
    echo ""
    echo "Variáveis de ambiente opcionais:"
    echo "  MYSQL_HOST       (padrão: 10.12.0.9)"
    echo "  MYSQL_PORT       (padrão: 3306)"
    echo "  MYSQL_USER       (padrão: inventario_app)"
    echo "  MYSQL_DATABASE   (padrão: inventario)"
    exit 1
}

check_dependencies() {
    local missing=0
    for cmd in mysql gzip; do
        if ! command -v "${cmd}" &> /dev/null; then
            log "ERROR" "Comando não encontrado: ${cmd}"
            missing=1
        fi
    done
    if [ "${missing}" -ne 0 ]; then
        log "ERROR" "Dependências ausentes. Abortando."
        exit 1
    fi
}

# ============================================================================
# EXECUÇÃO PRINCIPAL
# ============================================================================

if [ -z "${1}" ]; then
    usage
fi

BACKUP_FILE="${1}"

if [ ! -f "${BACKUP_FILE}" ]; then
    log "ERROR" "Arquivo não encontrado: ${BACKUP_FILE}"
    exit 1
fi

# Verificar se é um arquivo .gz
if [[ "${BACKUP_FILE}" != *.gz ]]; then
    log "ERROR" "O arquivo deve ter extensão .gz"
    exit 1
fi

log "INFO" "=== INÍCIO DA RESTAURAÇÃO ==="
log "INFO" "Arquivo: ${BACKUP_FILE}"
log "INFO" "Banco destino: ${MYSQL_DATABASE} em ${MYSQL_HOST}:${MYSQL_PORT}"

check_dependencies

# Verificar conectividade
log "INFO" "Verificando conectividade com ${MYSQL_HOST}:${MYSQL_PORT}..."
if ! mysqladmin ping -h "${MYSQL_HOST}" -P "${MYSQL_PORT}" -u "${MYSQL_USER}" -p"${MYSQL_PASSWORD}" > /dev/null 2>&1; then
    log "ERROR" "Não foi possível conectar ao banco de dados em ${MYSQL_HOST}:${MYSQL_PORT}"
    exit 1
fi
log "INFO" "Conexão com o banco de dados estabelecida com sucesso."

# Descomprimir e restaurar
log "INFO" "Descomprimindo e restaurando backup..."

if ! gunzip -c "${BACKUP_FILE}" | mysql \
    -h "${MYSQL_HOST}" \
    -P "${MYSQL_PORT}" \
    -u "${MYSQL_USER}" \
    -p"${MYSQL_PASSWORD}" \
    "${MYSQL_DATABASE}" 2>/dev/null; then
    log "ERROR" "Falha ao restaurar o banco de dados."
    exit 1
fi

log "INFO" "=== RESTAURAÇÃO CONCLUÍDA COM SUCESSO ==="
log "INFO" "Banco de dados '${MYSQL_DATABASE}' restaurado com sucesso."

exit 0
