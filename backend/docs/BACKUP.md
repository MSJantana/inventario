# Documentação - Backup Automático do Banco de Dados

## Visão Geral

O Sistema de Inventário utiliza um container Docker dedicado para realizar backups automáticos do banco de dados MySQL hospedado em `10.12.0.9`.

O backup é executado diariamente às 02:00 via `cron`, utilizando `mysqldump`, com compressão `gzip`, retenção de 3 meses e envio de notificações por email via SMTP (Gmail).

---

## Estrutura de Arquivos

```
backend/
├── Dockerfile.backup          # Imagem Debian slim com ferramentas de backup
├── docker-compose.backup.yml  # Orquestração do container de backup
├── .env.backup                # Variáveis de ambiente (exemplo)
├── scripts/
│   ├── backup.sh              # Script principal de backup
│   ├── restore.sh             # Script de restauração
│   ├── entrypoint.sh          # Ponto de entrada do container
│   └── backup-cron            # Configuração do cron
└── docs/
    └── BACKUP.md              # Este documento
```

---

## Configuração

### 1. Copiar o arquivo de variáveis de ambiente

```bash
cd backend
cp .env.backup .env.backup.local
```

Edite o arquivo `.env.backup.local` com as credenciais reais:

```bash
MYSQL_HOST=10.12.0.9
MYSQL_PORT=3306
MYSQL_USER=inventario_app
MYSQL_PASSWORD=sua_senha_real
MYSQL_DATABASE=inventario

BACKUP_DIR=/backup/inventario
BACKUP_RETENTION_MONTHS=3

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-app-do-google
SMTP_FROM=seu-email@gmail.com
SMTP_TO=admin@empresa.com
```

> **Importante sobre o Gmail:** Não use a senha normal da conta. Gere uma **senha de app** (App Password) na Conta do Google com autenticação de dois fatores ativada: https://myaccount.google.com/apppasswords

### 2. Subir o container

```bash
cd backend
docker-compose -f docker-compose.backup.yml up -d
```

### 3. Verificar se está rodando

```bash
docker-compose -f docker-compose.backup.yml logs -f inventario-backup
```

---

## Como Funciona

### Agendamento
O backup roda automaticamente todos os dias às **02:00** via `cron` dentro do container.

### Processo
1. Conecta ao banco MySQL em `10.12.0.9:3306`
2. Executa `mysqldump` com opções `--single-transaction --quick --routines --triggers --events`
3. Comprime o resultado com `gzip`
4. Salva o arquivo `inventario-YYYY-MM-DD.sql.gz` no volume `/backup/inventario`
5. Remove backups com mais de 3 meses (configurável via `BACKUP_RETENTION_MONTHS`)
6. Envia email de sucesso ou falha via SMTP do Gmail
7. Grava logs em `/var/log/backup/`

---

## Restaurando um Backup

### Listar backups disponíveis

```bash
docker exec inventario-backup ls -lh /backup/inventario/
```

### Restaurar em outro banco (ex: homologação)

```bash
# Copiar o arquivo para fora do container
docker cp inventario-backup:/backup/inventario/inventario-2026-11-25.sql.gz ./backup-2026-11-25.sql.gz

# Restaurar em outro ambiente
docker run --rm \
  -e MYSQL_HOST=10.12.3.231 \
  -e MYSQL_USER=inventario_app \
  -e MYSQL_PASSWORD=senha \
  -e MYSQL_DATABASE=inventario \
  -v $(pwd)/backup-2026-11-25.sql.gz:/backup-2026-11-25.sql.gz \
  inventario-backup \
  /app/restore.sh /backup-2026-11-25.sql.gz
```

Ou restaurar diretamente no mesmo container:

```bash
docker exec inventario-backup /app/restore.sh /backup/inventario/inventario-2026-11-25.sql.gz
```

---

## Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `docker-compose -f docker-compose.backup.yml up -d` | Iniciar o container |
| `docker-compose -f docker-compose.backup.yml down` | Parar o container |
| `docker-compose -f docker-compose.backup.yml logs -f inventario-backup` | Ver logs em tempo real |
| `docker exec inventario-backup /app/backup.sh` | Executar backup manualmente |
| `docker exec inventario-backup /app/restore.sh /backup/inventario/arquivo.sql.gz` | Restaurar um backup |
| `docker exec inventario-backup crontab -l` | Ver o cron agendado |

---

## Solução de Problemas

### Backup não está sendo executado
Verifique se o cron está rodando:
```bash
docker exec inventario-backup service cron status
```

### Erro de conexão com o banco
Verifique se o servidor `10.12.0.9` está acessível e se as credenciais estão corretas:
```bash
docker exec inventario-backup mysqladmin ping -h 10.12.0.9 -P 3306 -u inventario_app -p
```

### Email não está sendo enviado
Verifique as credenciais SMTP do Gmail e se a "senha de app" está correta. Verifique os logs:
```bash
docker exec inventario-backup tail -f /var/log/backup/cron.log
```

### Aumentar retenção
Edite a variável `BACKUP_RETENTION_MONTHS` no `.env.backup` e reinicie o container:
```bash
docker-compose -f docker-compose.backup.yml up -d
```

---

## Segurança

- As credenciais são passadas via variáveis de ambiente (não hardcoded)
- O arquivo `.env.backup` **não deve ser commitado** no Git
- O backup é comprimido com gzip
- O container não expõe portas para a rede externa

---

## Histórico de Versões

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0 | 25/11/2026 | Versão inicial com backup automático, retenção de 3 meses, email de alerta via Gmail |
