# AGENTS.md — Sistema de Inventário de Equipamentos

Este arquivo fornece contexto, instruções e diretrizes para agentes de IA que trabalhem neste repositório. Leia antes de fazer alterações.

---

## 1. Visão geral do sistema

**Sistema de Inventário de Equipamentos** — controle de patrimônio de equipamentos (computadores, notebooks, impressoras, projetores, tablets, monitores, roteadores, switches, etc.) distribuídos por escolas.

- **Backend:** Node.js + Express (ES modules), Prisma ORM, MySQL 8. Porta `3002`.
- **Frontend:** React + Vite, servido por nginx. Porta `80` (container) / `8080` (host).
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
2. **Rotas de autenticação precisam de rate limiting.** `/api/usuarios/login` e `/api/usuarios/recuperar-senha` ainda não possuem proteção contra brute force (passo pendente — curto prazo).
3. **CSRF token obrigatório** em métodos não-idempotentes (POST/PUT/PATCH/DELETE) em rotas autenticadas. Middleware: `backend/src/middlewares/csrf.js`.
4. **CORS restrito** a origens permitidas (`CORS_ALLOWED_ORIGINS`). Localhost/redes privadas são permitidas apenas em desenvolvimento.
5. **Senhas sempre hasheadas** com `bcryptjs` (fator 10). Nunca armazenar senha em texto claro.
6. **JWT expira em 1h** (`JWT_EXPIRES_IN`). Atualmente armazenado em `localStorage` no frontend (risco conhecido — migração para cookie `HttpOnly/Secure/SameSite` pendente).
7. **Controle de acesso por RBAC** (`ADMIN`, `GESTOR`, `TECNICO`, `USUARIO`) + escopo multi-escola via `backend/src/utils/schoolAccess.js`.
8. **Erros não devem vazar stack traces em produção.** O `errorHandler.js` controla isso via variável `isDev` / `LOG_STACK`.

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

- [ ] Remover `.env-dev` do histórico — **feito** (arquivo removido do índice e histórico reescrito)
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

Última atualização: 19 de novembro de 2026.