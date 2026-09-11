# Debug Session: backend-startup-500

Status: **[OPEN]**
Data: 2026-09-10
Sintoma: Usuário reporta "Failed to load resource: the server responded with a status of 500 (Internal Server Error) ao subir o projeto". Nenhum endpoint específico informado ainda. Stack trace desconhecida.
Ambiente: Windows, c:\Sistemas\Inventario, Node backend (Express + Prisma MySQL) + Vite frontend

---

## Hipóteses Falsificáveis (H1..H5)

| ID | Hipótese | Como falsificar / confirmar |
|---|---|---|
| H1 | **Prisma Client desatualizado**: Schema foi atualizado com `CHROMEBOOK`, `sourceExternalId`, `importMetadata`, mas `prisma generate` NÃO foi rodado → `require('@prisma/client')` carrega modelo antigo sem `ImportacaoWinAudit.tipoArquivo` ou `Equipamento.sourceExternalId` → qualquer rota usando esses campos retorna 500 em runtime (prisma client assertion error). | Rodar `cd backend; npx prisma version` e verificar data do `client`; comparar `schema.prisma Equipamento` com `node_modules/@prisma/client/index.d.ts` se contém `sourceExternalId`. |
| H2 | **Sintaxe/ReferenceError em arquivo ChromeOS novo importado na boot**: `ChromeOSImportService.js`, `chromeosUpload.js`, `chromeosImportController.js`, `routes/equipamentos.js chain ChromeOS` tem `require()` de variável não definida (ex.: `MAX_WINAUDIT_BYTES` usado mas nunca `require('../utils/...')`). App quebra no `require` inicial → 500 **em todas as rotas** (ou app nem inicia). | Rodar backend em foreground (`node src/index.js` ou `npm start`) e capturar stack do processo morrer / erro 500 primeiro hit. |
| H3 | **Connection string MySQL inválida**: `backend/.env` ausente, `DATABASE_URL` malformado, ou usuário MySQL sem permissões. Primeira rota que acesse Prisma falha 500 com `Can't reach database server`. | Verificar `ls backend/.env*` e rodar `npx prisma db execute --stdin "SELECT 1"` ou o healthcheck padrão se existir. |
| H4 | **Rota equipamentos ChromeOS duplicação de verbo**: Duas rotas `POST /api/equipamentos/importar/...` com mesmo pattern (ex.: winaudit usou `upload.any()` e chromeos também) → `Error: Can't set headers after they are sent` → 500 em `/importar/chromeos/preview` ou outra. | Conferir `routes/equipamentos.js` ordem das rotas ChromeOS vs WinAudit. |
| H5 | **Middleware upload multer memoryStorage mal-configurado**: `chromeosUpload` referencia algo de `storage` ou `limits` que não existe → ao subir o arquivo, multer estoura um TypeError → 500 POST `/preview`. | Conferir `utils/upload.js chromeosUpload` export; rodar `node --check src/utils/upload.js`. |

---

## Log de Eventos

| Passo | Evidência | H confirmada/rejeitada |
|---|---|---|
| 1 | Criado debug file, hipóteses listadas | |
