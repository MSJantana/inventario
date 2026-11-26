# AGENTS.md — Sistema de Inventário de Equipamentos

Este arquivo fornece contexto, instruções e diretrizes para agentes de IA que trabalhem neste repositório. Leia antes de fazer alterações.

---

## 1. Visão geral do sistema

**Sistema de Inventário de Equipamentos** — controle de patrimônio de equipamentos (computadores, notebooks, impressoras, projetores, tablets, monitores, roteadores, switches, etc.) distribuídos por escolas.

- **Backend:** Node.js + Express (ES modules), Prisma ORM, MySQL 8. Porta `3002`. Versão `1.1.14`.
- **Frontend:** React + Vite, servido por nginx. Porta `80` (container) / `8080` (host). Versão `1.3.6`.
- **Banco:** MySQL 8 via Docker (`docker-compose.yml`).
- **Orquestração:** `docker-compose.yml`, `docker-compose.portainer.yml`, `Jenkinsfile`.

---

## 2. Estrutura de diretórios

```
backend/
  src/
    controllers/   — lógica de requisição/resposta
    middlewares/   — auth, authorize, csrf, validacao, errorHandler, upload
    routes/        — rotas da API (/api/equipamentos, /api/usuarios, etc.)
    services/      — serviços de negócio e importação (WinAudit, ChromeOS)
    utils/         — utilitários (mac, schoolAccess, logger, emailService, compat)
    index.js       — entrada da aplicação Express
  prisma/
    schema.prisma  — modelo de dados do Prisma
    migrations/    — (ignorado no .gitignore)
  .env             — (ignorado, não commitar)
  .env-dev         — (ignorado, não commitar — foi removido do histórico)

frontend/
  src/
    components/, hooks/, lib/, pages/, services/, store/, types/, utils/
  nginx.conf       — reverse proxy e cabeçalhos estáticos
  vite.config.ts
```

---

## 3. Regras de segurança críticas (NÃO alterar sem revisão)

1. **Nunca commitar arquivos `.env`.** Segredos (`JWT_SECRET`, `CSRF_SECRET`, `DATABASE_URL`, senhas SMTP, etc.) devem ser injetados via variáveis de ambiente ou Docker secrets. O `.env-dev` já foi removido do histórico do Git.
2. **Rate limiting em rotas de autenticação.** `/api/usuarios/login` (máx. 10 tentativas/IP/min) e `/api/usuarios/recuperar-senha` (máx. 5 tentativas/IP/min) possuem proteção contra brute force via `express-rate-limit` (`backend/src/middlewares/rateLimiter.js`).
3. **CSRF token obrigatório** em métodos não-idempotentes (POST/PUT/PATCH/DELETE) em rotas autenticadas. Middleware: `backend/src/middlewares/csrf.js`.
4. **CORS restrito** a origens permitidas (`CORS_ALLOWED_ORIGINS`). Localhost/redes privadas são permitidas apenas em desenvolvimento.
5. **Senhas sempre hasheadas** com `bcryptjs` (fator 10). Nunca armazenar senha em texto claro.
6. **JWT expira em 1h** (`JWT_EXPIRES_IN`). Atualmente armazenado em `localStorage` no frontend (risco conhecido — migração para cookie `HttpOnly/Secure/SameSite` pendente).
7. **Logout com invalidação de JWT.** O logout revoga o `jti` do token na tabela `RevokedToken` (blocklist), tornando o token inválido antes da expiração natural. Middleware `auth.js` consulta a blocklist a cada requisição.
8. **Recuperação de senha sem enumeração de e-mail.** A rota `/api/usuarios/recuperar-senha` retorna sempre a mesma mensagem genérica, independentemente de o e-mail existir ou não.
9. **Controle de acesso por RBAC** (`ADMIN`, `GESTOR`, `TECNICO`, `USUARIO`) + escopo multi-escola via `backend/src/utils/schoolAccess.js`.
10. **Erros não devem vazar stack traces em produção.** O `errorHandler.js` controla isso via variável `isDev` / `LOG_STACK`.

---

## 4. Comandos úteis

| Ação | Comando |
|------|---------|
| Instalar dependências (backend) | `cd backend && npm install` |
| Instalar dependências (frontend) | `cd frontend && npm install` |
| Rodar backend (dev) | `cd backend && npm run dev` |
| Rodar frontend (dev) | `cd frontend && npm run dev` |
| Build Docker | `docker-compose up --build` |
| Verificar arquivos `.env` rastreados | `git ls-files | findstr /i ".env"` (Windows) ou `git ls-files \| grep -i .env` (Linux/Mac) |
| Ver status do git | `git status --short` |

---

## 5. Variáveis de ambiente obrigatórias

Definir antes de rodar a aplicação:

- `DATABASE_URL` — conexão MySQL
- `JWT_SECRET` — segredo para assinar tokens JWT
- `CSRF_SECRET` — segredo para tokens CSRF
- `CORS_ALLOWED_ORIGINS` — origens permitidas (vírgula separada)
- `APP_PUBLIC_URL` — URL pública da aplicação (usada em e-mails de recuperação)
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM` — SMTP
- `WINAUDIT_MAX_MB` — tamanho máximo de upload WinAudit (default 5)
- `PORT` — porta do backend (default 3002)
- `NODE_ENV` — `production` ou `development`

---

## 6. Pendências conhecidas (roadmap de segurança)

- [x] Remover `.env-dev` do histórico — **feito** (arquivo removido do índice e histórico reescrito)
- [ ] Rotacionar segredos expostos anteriormente (JWT_SECRET, CSRF_SECRET, senhas de banco e SMTP)
- [x] Adicionar rate limiting em `/login` e `/recuperar-senha`
- [ ] Migrar JWT de `localStorage` para cookie `HttpOnly/Secure/SameSite`
- [ ] Adicionar cabeçalhos de segurança HTTP (HSTS, CSP, X-Frame-Options, nosniff)
- [x] Implementar logout / invalidação de JWT (blocklist RevokedToken)
- [x] Corrigir enumeração de e-mail em recuperação de senha (retornar mensagem genérica)

---

## 7. Convenções de código

- **Backend:** ES modules (`import/export`), Express, Prisma. Middlewares em `backend/src/middlewares/`. Rotas em `backend/src/routes/`. Controllers em `backend/src/controllers/`.
- **Frontend:** TypeScript, React, Vite, Tailwind CSS.
- **Mensagens de commit:** em português (conforme histórico do repo), ex.: `feat: ...`, `fix: ...`, `refactor: ...`.

---

## 8. Como adicionar uma nova rota segura

1. Crie o controller em `backend/src/controllers/`.
2. Crie/adicione a rota em `backend/src/routes/<recurso>.js`.
3. Aplique middlewares na ordem: `auth` → `csrfProtect` (se não-idempotente) → `permitRoles(...)` → validação → controller.
4. Valide entrada com middlewares em `backend/src/middlewares/validacao.js` ou crie um novo.
5. Não exporte segredos nem logs de dados sensíveis (senhas, tokens, CPF/CNPJ).

---

Última atualização: 26 de novembro de 2026.

---

## 9. Roadmap de melhorias futuras (para estudo)

Este roadmap reúne melhorias identificadas para o sistema, organizadas por fase e prioridade. Serve como base para planejamento de futuras atualizações.

### Fase 1 — Segurança Crítica

| # | Item | Problema | Impacto | Esforço |
|---|------|----------|---------|---------|
| 1.1 | Rotacionar segredos expostos | **Implementado** — JWT_SECRET, CSRF_SECRET, senhas de banco e SMTP rotacionados | Alto | Médio |
| 1.2 | Prevenir commit de `.env` | **Implementado** — `.gitignore` bloqueia arquivos `.env`, `.gitignore` no backend também | Alto | Baixo |
| 1.3 | Migrar JWT de `localStorage` para cookie `HttpOnly/Secure/SameSite` | Token acessível por XSS via `localStorage` | Alto | Alto |
| 1.4 | Rate limiting em `/login` e `/recuperar-senha` | **Implementado** (express-rate-limit) | Médio | Baixo |

### Fase 2 — Segurança Alta

| # | Item | Problema | Impacto | Esforço |
|---|------|----------|---------|---------|
| 2.1 | Cabeçalhos de segurança HTTP | **Implementado** (HSTS, X-Frame-Options, CSP, nosniff, Referrer-Policy no nginx.conf) | Médio | Baixo |
| 2.2 | Logout invalida sessão em todos os dispositivos | Não há `tokenVersion` por usuário; token roubado dura até 1h | Médio | Médio |
| 2.3 | Enumeração de usuários em outros endpoints | Rotas de consulta confirmam existência sem rate limiting | Médio | Médio |
| 2.4 | Upload de arquivos HTML (WinAudit) | Risco de XSS se arquivos forem servidos como HTML | Médio | Médio |

### Fase 3 — Segurança Média

| # | Item | Problema | Impacto | Esforço |
|---|------|----------|---------|---------|
| 3.1 | Logs de consultas Prisma em desenvolvimento | **Implementado** — logging de queries removido | Médio | Baixo |
| 3.2 | Healthcheck expõe informações internas | **Implementado** — resposta simplificada sem dbHost/dbIsDev | Baixo/Médio | Baixo |
| 3.3 | Política de senha forte | Sem exigência de complexidade | Médio | Médio |
| 3.4 | Upload de arquivos HTML (WinAudit) | Risco de XSS se servidos no domínio do frontend | Médio | Médio |

### Fase 4 — DevOps e Infraestrutura

| # | Item | Problema | Impacto | Esforço |
|---|------|----------|---------|---------|
| 4.1 | Build do Docker quebrado no CI | **Implementado** — CI/CD com GitHub Actions para backup (docker-compose.backup.yml) | Alto | Baixo |
| 4.2 | Banco de dados exposto na rede | **Implementado** — porta 3306 não publicada no docker-compose.yml | Alto | Médio |
| 4.3 | Backup automático do banco | **Implementado** — container Debian no Portainer, mysqldump remoto, retenção 3 meses, email via Gmail | Alto | Médio |
| 4.4 | Validação de variáveis de ambiente | Sem validação obrigatória na inicialização | Médio | Baixo |

### Fase 5 — Qualidade de Código

| # | Item | Problema | Impacto | Esforço |
|---|------|----------|---------|---------|
| 5.1 | Duplicação de upload (WinAudit e ChromeOS) | Código repetido no `upload.js` | Médio | Médio |
| 5.2 | `auth.js` consulta banco em toda requisição | Carga desnecessária no MySQL | Médio | Médio |
| 5.3 | Validação de e-mail regex simples | Pode aceitar/rejeitar casos extremos incorretamente | Baixo | Baixo |

### Fase 6 — Testes e Qualidade de Software

| # | Item | Problema | Impacto | Esforço |
|---|------|----------|---------|---------|
| 6.1 | Não há testes automatizados | Sem testes unitários, integração ou E2E | Alto | Alto |
| 6.2 | Não há contrato de API | **Implementado** (OpenAPI/Swagger em `/api-docs` + testes de contrato em `backend/tests/contract/`) | Médio | Médio |

### Fase 7 — Monitoramento e Observabilidade

| # | Item | Problema | Impacto | Esforço |
|---|------|----------|---------|---------|
| 7.1 | Não há alertas de erro | Sem integração com Sentry ou similar | Médio | Médio |
| 7.2 | Não há métricas de uso | Sem rastreamento de endpoints ou tempo de resposta | Baixo | Médio |
| 7.3 | Logs não centralizados | Logs locais, sem correlação distribuída | Médio | Médio |

### Fase 8 — Experiência do Usuário (UX/UI)

| # | Item | Problema | Impacto | Esforço |
|---|------|----------|---------|---------|
| 8.1 | Não há "lembrar de mim" | JWT expira em 1h para todos | Baixo | Médio |
| 8.2 | Não há tela de perfil do usuário | Usuário não pode editar próprios dados | Médio | Médio |
| 8.3 | Confirmação de exclusão crítica | **Implementado** — exclusão exige digitar "CONFIRMAR" para prosseguir | Baixo | Baixo |

---

## 9. Backup do Banco de Dados — Configuração no Portainer

O backup do banco de dados roda em um container Docker dedicado (`backend/docker-compose.backup.yml`) que executa `mysqldump` remoto no banco `10.12.0.9`.

### Como Configurar no Portainer

As variáveis de ambiente devem ser injetadas diretamente na interface do Portainer, não via arquivo `.env`.

#### Variáveis de Ambiente Necessárias

| Variável | Exemplo | Descrição |
|----------|---------|-----------|
| `MYSQL_HOST` | `10.12.0.9` | Host do banco MySQL |
| `MYSQL_PORT` | `3306` | Porta do MySQL |
| `MYSQL_USER` | `inventario_app` | Usuário do banco |
| `MYSQL_PASSWORD` | `sua_senha` | Senha do banco |
| `MYSQL_DATABASE` | `inventario` | Nome do banco |
| `BACKUP_DIR` | `/backup/inventario` | Diretório dos backups locais |
| `BACKUP_RETENTION_MONTHS` | `3` | Meses de retenção dos backups |
| `SMTP_HOST` | `smtp.gmail.com` | Servidor SMTP |
| `SMTP_PORT` | `587` | Porta SMTP |
| `SMTP_USER` | `seu-email@gmail.com` | Email remetente |
| `SMTP_PASSWORD` | `sua-senha-de-app` | Senha de app do Gmail |
| `SMTP_FROM` | `seu-email@gmail.com` | Email de origem |
| `SMTP_TO` | `admin@empresa.com` | Email de destino dos alertas |

### Passos para Deploy

1. No Portainer, vá em **Stacks** → **Add Stack**
2. Nomeie a stack como `inventario-backup`
3. Escolha o arquivo `docker-compose.backup.yml`
4. Adicione as variáveis de ambiente listadas acima na seção **Environment variables**
5. Clique em **Deploy the stack**

### Comandos Úteis

```bash
# Executar backup manualmente
docker exec inventario-backup /app/backup.sh

# Ver logs do backup
docker logs -f inventario-backup

# Restaurar um backup (exemplo)
docker exec inventario-backup /app/restore.sh /backup/inventario/inventario-2026-11-25.sql.gz
```

Última atualização: 26 de novembro de 2026.