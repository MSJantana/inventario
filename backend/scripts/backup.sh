#!/bin/bash
#
# Script de backup do banco de dados MySQL - Sistema de Inventário
# Realiza backup remoto via mysqldump, comprime com gzip,
# mantém retenção configurada e envia notificação por email.
#

set -e

# ============================================================================
# CONFIGURAÇÕES (podem ser sobrescritas por variáveis de ambiente)
# ============================================================================
MYSQL_HOST="${MYSQL_HOST:-10.12.0.9}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-inventario_app}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"
MYSQL_DATABASE="${MYSQL_DATABASE:-inventario}"

BACKUP_DIR="${BACKUP_DIR:-/backup/inventario}"
BACKUP_RETENTION_MONTHS="${BACKUP_RETENTION_MONTHS:-3}"

# Email (Gmail)
SMTP_HOST="${SMTP_HOST:-smtp.gmail.com}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-}"
SMTP_PASSWORD="${SMTP_PASSWORD:-}"
SMTP_FROM="${SMTP_FROM:-}"
SMTP_TO="${SMTP_TO:-}"

LOG_DIR="/var/log/backup"
LOG_FILE="${LOG_DIR}/backup-$(date +%Y-%m-%d).log"

# ============================================================================
# FUNÇÕES
# ============================================================================

log() {
    local level="$1"
    local message="$2"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

send_email() {
    local subject="$1"
    local body="$2"
    local log_file="$3"

    if [ -z "${SMTP_USER}" ] || [ -z "${SMTP_PASSWORD}" ] || [ -z "${SMTP_TO}" ]; then
        log "WARN" "SMTP não configurado completamente. Email não será enviado."
        return
    fi

    {
        echo "From: ${SMTP_FROM}"
        echo "To: ${SMTP_TO}"
        echo "Subject: ${subject}"
        echo "MIME-Version: 1.0"
        echo "Content-Type: text/plain; charset=UTF-8"
        echo ""
        echo "${body}"
        echo ""
        echo "----------------------------------------"
        echo "Log completo:"
        cat "${log_file}" 2>/dev/null || echo "Log não disponível"
    } | mail -s "${subject}" "${SMTP_TO}" 2>/dev/null || {
        log "WARN" "Falha ao enviar email de notificação."
    }
}

check_dependencies() {
    local missing=0
    for cmd in mysqldump gzip mysql mail; do
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

check_connectivity() {
    log "INFO" "Verificando conectividade com ${MYSQL_HOST}:${MYSQL_PORT}..."
    if ! mysqladmin ping -h "${MYSQL_HOST}" -P "${MYSQL_PORT}" -u "${MYSQL_USER}" -p"${MYSQL_PASSWORD}" > /dev/null 2>&1; then
        log "ERROR" "Não foi possível conectar ao banco de dados em ${MYSQL_HOST}:${MYSQL_PORT}"
        send_email "FALHA - Backup do Banco de Dados" \
            "Não foi possível conectar ao banco de dados em ${MYSQL_HOST}:${MYSQL_PORT}.\n\nVerifique se o servidor está acessível e as credenciais estão corretas." \
            "${LOG_FILE}"
        exit 1
    fi
    log "INFO" "Conexão com o banco de dados estabelecida com sucesso."
}

perform_backup() {
    local backup_file
    backup_file="${BACKUP_DIR}/inventario-$(date +%Y-%m-%d).sql.gz"

    log "INFO" "Iniciando backup do banco de dados '${MYSQL_DATABASE}'..."

    # Criar diretório se não existir
    mkdir -p "${BACKUP_DIR}"

    # Executar mysqldump
    if ! mysqldump \
        --single-transaction \
        --quick \
        --routines \
        --triggers \
        --events \
        -h "${MYSQL_HOST}" \
        -P "${MYSQL_PORT}" \
        -u "${MYSQL_USER}" \
        -p"${MYSQL_PASSWORD}" \
        "${MYSQL_DATABASE}" 2>/dev/null | gzip > "${backup_file}"; then
        log "ERROR" "Falha ao executar mysqldump."
        send_email "FALHA - Backup do Banco de Dados" \
            "Falha ao executar mysqldump no banco de dados '${MYSQL_DATABASE}' em ${MYSQL_HOST}.\n\nVerifique as credenciais e a conectividade." \
            "${LOG_FILE}"
        exit 1
    fi

    local file_size
    file_size=$(du -h "${backup_file}" | cut -f1)
    log "INFO" "Backup concluído com sucesso: ${backup_file} (${file_size})"

    # Retornar nome do arquivo para uso posterior
    echo "${backup_file}"
}

apply_retention() {
    log "INFO" "Aplicando retenção de ${BACKUP_RETENTION_MONTHS} meses..."

    # Encontrar e remover arquivos mais antigos que X meses
    local removed=0
    while IFS= read -r -d '' file; do
        rm -f "${file}"
        removed=$((removed + 1))
        log "INFO" "Removido backup antigo: ${file}"
    done < <(find "${BACKUP_DIR}" -name "inventario-*.sql.gz" -mtime +$((BACKUP_RETENTION_MONTHS * 30)) -print0 2>/dev/null || true)

    if [ "${removed}" -eq 0 ]; then
        log "INFO" "Nenhum backup antigo para remover."
    fi
}

# ============================================================================
# EXECUÇÃO PRINCIPAL
# ============================================================================

mkdir -p "${LOG_DIR}" "${BACKUP_DIR}"

log "INFO" "=== INÍCIO DO BACKUP ==="
log "INFO" "Banco: ${MYSQL_DATABASE} em ${MYSQL_HOST}:${MYSQL_PORT}"
log "INFO" "Diretório de backup: ${BACKUP_DIR}"
log "INFO" "Retenção: ${BACKUP_RETENTION_MONTHS} meses"

check_dependencies
check_connectivity

BACKUP_FILE=$(perform_backup)
apply_retention

log "INFO" "=== FIM DO BACKUP (SUCESSO) ==="

send_email "SUCESSO - Backup do Banco de Dados" \
    "Backup do banco de dados '${MYSQL_DATABASE}' concluído com sucesso.\n\n\
Arquivo: ${BACKUP_FILE}\n\
Banco: ${MYSQL_HOST}:${MYSQL_PORT}\n\
Data: $(date '+%Y-%m-%d %H:%M:%S')\
" \
    "${LOG_FILE}"

exit 0
