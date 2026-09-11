# Plano de Implementação: Importar Chromebook via CSV

**Artefato vinculado:** [spec.md](file:///C:/Sistemas/Inventario/.trae/specs/importar-chromebook-via-csv/spec.md)
**Cobertura AC:** 100% de AC-R01..AC-R14 e AC-U01..AC-U05

---

## Convenções
- Cada tarefa tem: Prioridade (high / medium / low), Dependências, Cobertura AC, TR (Test Requirements — rule ou rubric).
- Ao final de **cada etapa**, executar:
  - Backend: `cd backend ; npm run lint` (se existir) ou `npx eslint src/` + conferir build (`npm run build` se disponível).
  - Frontend: `cd frontend ; npm run lint` + `npm run build` ou `npx tsc --noEmit`.
  - Migrations: executar `npx prisma migrate dev` (apenas na etapa 1).
- Nenhuma tarefa renomeia campos existentes ou quebra APIs já funcionais.

---

## Tarefas de Implementação

### Task 1: Migração Prisma (enum + campos novos)
**Prioridade:** high · **Dependências:** — · **ACs cobertos:** AC-R01

**Objetivo:** Expandir schema para acomodar Chromebook sem quebrar Equipamento / WinAudit existentes.

**Arquivos a alterar/criar:**
- ALTERAR: [schema.prisma](file:///C:/Sistemas/Inventario/backend/prisma/schema.prisma)
  - Adicionar `CHROMEBOOK` ao enum `TipoEquipamento` (manter ordem alfabética localizada no final da lista, após `TABLET`).
  - Adicionar campos no model `Equipamento`:
    - `sourceExternalId String?` (nullable, sem índice/unique por ora; deduplicação é feita em nível de serviço).
    - `importMetadata Json?` (nullable).
- CRIAR: migration (via `npx prisma migrate dev --name add_chromebook_type_and_import_metadata`); migrações ficam em `backend/prisma/migrations/*/` (não editar manualmente a SQL gerada).

**Test Requirements (TR):**
- **TR-1.1 (rule):** `npx prisma validate` retorna exit code 0 sem warnings.
- **TR-1.2 (rule):** Migration aplica em banco dev sem erros (`prisma migrate dev` OK).
- **TR-1.3 (rule):** Criar manualmente um Equipamento com `tipo=CHROMEBOOK` retorna sucesso.
- **TR-1.4 (rule):** Criação WinAudit e criação manual continuam funcionando (campos novos nullable não afetam).

---

### Task 2: Utils backend — parser CSV RFC-4180 + normalizador ChromeOS
**Prioridade:** high · **Dependências:** Task 1 · **ACs cobertos:** RF-01, RF-02, RF-03, AC-U01

**Objetivo:** Extrair o parsing CSV e o mapeamento para o objeto normalizado compartilhado em funções puras (fora do service), para reduzir complexidade cognitiva e permitir reuso com WinAudit.

**Arquivos a alterar/criar:**
- CRIAR: [backend/src/utils/chromeos/parseCsv.js](file:///C:/Sistemas/Inventario/backend/src/utils/chromeos/parseCsv.js)
  - Parser manual sem dependências externas (manter zero novas deps se possível; usar estratégia de state machine para aspas, BOM UTF-8, separador vírgula, CRLF/LF).
  - Exporta `parseChromeOsCsv(buffer: Buffer, originalName: string): { valido: boolean, erro?: string, colunas: string[], linhas: Record<string,string>[] }`.
  - Narrowing explícito `typeof v === 'string'` antes de operações (S6551).
- CRIAR: [backend/src/utils/chromeos/normalizers.js](file:///C:/Sistemas/Inventario/backend/src/utils/chromeos/normalizers.js)
  - Exporta:
    - `reconhecerColuna(chave: string): ChaveChromeOS | null` — faz mapa case-insensitive + nomes alternativos do RF-01.
    - `normalizarLinhaChromeOS(linhaRaw: Record<string,unknown>, idx: number): NormalizedRawChromeOS` — extrai e valida cada campo (serial, deviceId, MACs, datas).
    - `montarEquipamentoNormalizado(normalizedRaw: NormalizedRawChromeOS, contexto: { escolaPadraoId?: string | null, escolasDisponiveis: Escola[] }): NormalizedEquipmentResult` — aplica RF-03 e RF-04 (heurística escola); retorna `{ equipamento: NormalizedEquipmentInput, escolaPendente: boolean, candidatosEscola: Escola[], avisos: string[] }`.
    - Conversões auxiliares: `epochMsOuIsoParaDate(v: unknown): string | null` (para `lastPolicySyncMs` e `autoUpdateExpiration`).
  - Ordenar listas candidatas com `.sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'))` (S2871).
- ALTERAR: [backend/src/utils/winaudit/normalizers.js](file:///C:/Sistemas/Inventario/backend/src/utils/winaudit/normalizers.js) — **APENAS** extrair/exportar funções genéricas compartilhadas que ainda não o são (ex.: `normalizarTexto`, `normalizarSerial`, `normalizarNome`, `normalizarUsuarioNome`, `normalizarMacEntrada`) em um arquivo compartilhado OU manter ambas as cópias se a extração quebrar WinAudit. Decisão: manter cópia em `utils/chromeos/normalizers.js` reutilizando as importando via path. Verificar se o Node/Esm aceita import de `../winaudit/normalizers.js` sem problemas. Se sim, importar e reutilizar; se não, duplicar apenas as 5 funções mínimas necessárias (S6644 — preferir `v || undefined` a ternários).

**Test Requirements (TR):**
- **TR-2.1 (rule):** Parser lê um CSV de exemplo com BOM UTF-8, aspas e CRLF e retorna `linhas.length` correto.
- **TR-2.2 (rule):** Linha sem serial e sem deviceId é marcada com erro e não gera objeto normalizado.
- **TR-2.3 (rule):** `montarEquipamentoNormalizado` retorna `tipo=CHROMEBOOK`, `status=DISPONIVEL` e `fabricante=processador=memoria=null` para qualquer entrada válida.
- **TR-2.4 (rule):** Nome gerado é `CB-<annotatedAssetId>` quando presente; fallback para `CB-<serialNumber>`; nenhum caso vazio.
- **TR-2.5 (rule):** Heurística escola retorna `escolaPendente=true` quando há ≥2 matches ou 0 matches.
- **TR-2.6 (rule):** MAC final = WiFi > Ethernet, normalizado para `AA:BB:CC:DD:EE:FF` maiúsculo.
- **TR-2.7 (rule):** `lint backend` e `tsc --noEmit frontend` passam sem novos erros (não há mudanças frontend ainda — este TR é regressão).

---

### Task 3: Utils backend — detecção de duplicidades estendida (sourceExternalId)
**Prioridade:** medium · **Dependências:** Task 2 · **ACs cobertos:** RF-05, AC-R05, AC-U04

**Objetivo:** Estender a lógica de duplicidade para também considerar `Equipamento.sourceExternalId` além de serial e MAC.

**Arquivos a alterar/criar:**
- ALTERAR: [backend/src/utils/winaudit/detectDuplicidades.js](file:///C:/Sistemas/Inventario/backend/src/utils/winaudit/detectDuplicidades.js)
  - Adicionar parâmetro opcional `sourceExternalId?: string` à entrada.
  - Se presente, incluir na consulta `OR` e no resultado com novo `tipo: 'sourceExternalId'` em `WinAuditDuplicidadeEntry`.
  - Bloqueio: `tipo === 'sourceExternalId'` → `bloqueio = true` (igual serial).
- CRIAR (ou simplesmente exportar do `detectDuplicidades.js`): reexportar um wrapper `detectarDuplicidadesChromeOS` que chama `detectarDuplicidades` com o novo parâmetro.

**Test Requirements (TR):**
- **TR-3.1 (rule):** Inserir equipamento com `sourceExternalId = 'abc123'` e rodar detecção com o mesmo valor → retorna duplicidade bloqueante.
- **TR-3.2 (rule):** Detecção WinAudit (sem o novo parâmetro) retorna comportamento idêntico a antes.
- **TR-3.3 (rule):** Duplicidade de MAC (WiFi e Ethernet) continua como alerta (não bloqueia).

---

### Task 4: Service ChromeOS (preview + confirmar)
**Prioridade:** high · **Dependências:** Tasks 2 + 3 · **ACs cobertos:** RF-06, RF-08, RF-09, RF-12, AC-R03..AC-R10, AC-U01..AC-U05

**Objetivo:** Implementar a camada service em `ChromeOSImportService.js` no mesmo estilo do `WinAuditImportService.js`, decompondo em funções por responsabilidade para manter S3776 ≤ 15.

**Arquivos a alterar/criar:**
- CRIAR: [backend/src/services/ChromeOSImportService.js](file:///C:/Sistemas/Inventario/backend/src/services/ChromeOSImportService.js)
  - Versão do importador: `CHROMEOS_IMPORTER_VERSION = process.env.CHROMEOS_IMPORTER_VERSION || '1.0.0'`.
  - Funções internas (todas com um objetivo único):
    - `validarInputArquivo(file)` → 400 se vazio.
    - `carregarEscolasParaUsuario(prisma, usuario)` → retorna lista de escolas com `id/nome/sigla` acessíveis.
    - `gerarRegistrosPreviewPorLinha({ linhasNormalizadas, usuarioId, escolaPadraoId, escolas, ipOrigem, arquivoInfo, startTime })` → para cada linha: roda duplicidades, monta `camposStatus`, registra `ImportacaoWinAudit (PREVIEW_GERADO)` e retorna `ChromeOSPreviewRow[]`.
    - `montarRespostaPreview({ previewItens, arquivoInfo })` → monta `ChromeOSPreviewResponse`.
    - **Exportado `gerarPreview({ file, usuarioId, escolaId, prisma, ipOrigem, tipoArquivo, versaoImportador })`**.
    - **Exportado `confirmarImportacao({ previewId, itens, usuario, prisma })`**:
      1. Carrega todos os `ImportacaoWinAudit` vinculados ao `previewId` (via `dadosBrutos.previewId` ou campo comum). *Decisão (AC-Q1 resolvida):* adotar estratégia de um `ImportLog` POR LINHA com `dadosBrutos.previewId` compartilhado. O primeiro registro (idx=0) é o mestre e é o que é retornado como `previewId`.
      2. Valida `status === PREVIEW_GERADO` e permissão.
      3. Para cada item selecionado: revalida duplicidades, aplica `overrides` e `escolaResolvidaId`, valida campos obrigatórios, e cria via transação (`EquipamentoService.criarEquipamento` + update `ImportacaoWinAudit → SUCESSO`).
      4. Para itens não selecionados → `CANCELADO`.
      5. Retorna array `resultados: [{ linhaIdx, status, equipamentoId?, erroMotivo?, duplicidades? }]`.
    - Funções auxiliares:
      - `contarCamposPorStatusChromeOS` (reutiliza lógica do WinAudit se viável).
      - `montarCamposStatusInicialChromeOS(escolaEncontrado, possuiUsuario, possuiPatrimonio, possuiLocalizacao, possuiObservacoes, possuiMac, possuiSourceExternalId)`: para os campos que o ChromeOS preenche (nome, patrimonio, usuarioNome, escolaId, tipo, status, modelo, serial, localizacao, macaddress, observacoes, sourceExternalId); fabricante/processador/memoria/dataAquisicao são omitidos ou marcados NAO_ENCONTRADO mas não bloqueiam.
- CRIAR: (opcional) `backend/src/utils/chromeos/camposStatus.js` para os mapeamentos de status se o arquivo service crescer muito.

**Test Requirements (TR):**
- **TR-4.1 (rule):** CSV válido de 3 linhas → preview retorna 3 linhas + 3 `ImportLog PREVIEW_GERADO`.
- **TR-4.2 (rule):** Confirmação de 2 de 3 linhas → 2 Equipamentos criados, 2 `ImportLog SUCESSO`, 1 `CANCELADO`.
- **TR-4.3 (rule):** Duplicidade serial bloqueante → item fica com erroMotivo e NÃO cria equipamento.
- **TR-4.4 (rule):** Reconfirmação idempotente (mesmo payload) → mesmos resultados, novos equipamentos.
- **TR-4.5 (rule):** ImportLog criado por item tem `tipoArquivo='CSV'`, `versaoImportador`, `ipOrigem`, `duracaoMs`, `qtdCamposEncontrados`, `qtdCamposImportados`.
- **TR-4.6 (rubric):** Complexidade cognitiva por função — 0.5pt por função > 15 (medida via linter SonarLint se disponível; via análise estática manual caso contrário). **Limiar ≥ 1.8 (nenhuma ou no máximo 1 função com >15 e justificada por comentário).**

---

### Task 5: Controller ChromeOS + upload middleware específico + rotas
**Prioridade:** high · **Dependências:** Task 4 · **ACs cobertos:** RF-01, RF-10, RF-11, RF-12, AC-R02, AC-R11, AC-R12

**Objetivo:** Expor endpoints HTTP seguindo exatamente o padrão do `winauditImportController.js` (trace de logs, IP origem, tratamento multer, CSRF, roles).

**Arquivos a alterar/criar:**
- ALTERAR: [backend/src/middlewares/upload.js](file:///C:/Sistemas/Inventario/backend/src/middlewares/upload.js)
  - Duplicar a infraestrutura winaudit para CSV:
    - `CHROMEOS_ALLOWED_EXTENSIONS = Set(['.csv'])`
    - `CHROMEOS_ALLOWED_MIMES = Set(['text/csv','application/csv','text/plain','application/octet-stream'])`
    - `chromeosFileFilter` análogo + `chromeosUpload` com mesmos limites (MAX_WINAUDIT_BYTES ou nova env `CHROMEOS_MAX_MB` com fallback para o mesmo valor).
    - `chromeosFileField = 'arquivo'` (mesmo nome para consistência).
    - `chromeosFileLimitsInfo`, `buildChromeosFileError` analogos.
- CRIAR: [backend/src/controllers/chromeosImportController.js](file:///C:/Sistemas/Inventario/backend/src/controllers/chromeosImportController.js)
  - Importar `{ chromeosUpload, chromeosFileField, buildChromeosFileError }` do upload.js.
  - Implementar `extrairIpOrigem` e `extrairTipoArquivo` (pode importar do próprio controller via função compartilhada OU copiar idêntico — preferir copiar para evitar dependência circular, são ~20 linhas).
  - Exportar:
    - `importarChromeosPreview` (mesmos trace logs `[chromeos:preview]` do WinAudit; dentro do callback multer; em caso de erro, estruturar `statusCode`, `code`, `causaRaiz`, delegar para `next(error)`).
    - `importarChromeosConfirmar` (body JSON: `{ previewId, itens: [...] }`; sem multer).
    - (Opcional) `listarLogsImportacoes` / `obterLogImportacaoPorId` — reutilizar o mesmo endpoint WinAudit já existente, ou deixar a Auditoria ler tudo via mesmo model. Decisão: **não criar**, pois o model já é compartilhado e a tela Auditoria já lista todos.
- ALTERAR: [backend/src/routes/equipamentos.js](file:///C:/Sistemas/Inventario/backend/src/routes/equipamentos.js)
  - Antes do `/:id` e APÓS as rotas WinAudit, inserir:
    ```
    router.post(
      '/importar/chromeos/preview',
      auth,
      csrfProtect,
      permitRoles('ADMIN', 'GESTOR', 'TECNICO'),
      chromeosImportController.importarChromeosPreview,
    );
    router.post(
      '/importar/chromeos/confirmar',
      auth,
      csrfProtect,
      permitRoles('ADMIN', 'GESTOR', 'TECNICO'),
      chromeosImportController.importarChromeosConfirmar,
    );
    ```
  - Ordem é importante: rotas específicas (com /importar) vem ANTES do coringa `/:id`.

**Test Requirements (TR):**
- **TR-5.1 (rule):** `POST /importar/chromeos/preview` com arquivo `.html` retorna 400 + `code=CHROMEOS_INVALID_EXTENSION`.
- **TR-5.2 (rule):** Mesmo POST sem token retorna 401; sem CSRF retorna 403 `EBADCSRFTOKEN`; role `USUARIO` retorna 403.
- **TR-5.3 (rule):** `/confirmar` com previewId de outra pessoa retorna 403 (não-ADMIN).
- **TR-5.4 (rule):** Endpoints WinAudit `/importar/winaudit/*` continuam retornando 200/201 para cenários conhecidos (regressão).
- **TR-5.5 (rule):** `npm run lint` no backend passa sem novos warnings/erros.

---

### Task 6: Frontend — tipos TypeScript + service layer (axios)
**Prioridade:** high · **Dependências:** Task 5 · **ACs cobertos:** RF-06, RF-08, AC-U04

**Objetivo:** Criar contrato TS estrito para responses/requests ChromeOS e um service `importarChromeOS.ts` análogo ao `importarWinAudit.ts`.

**Arquivos a alterar/criar:**
- CRIAR: [frontend/src/types/chromeos.ts](file:///C:/Sistemas/Inventario/frontend/src/types/chromeos.ts)
  - Reexportar `StatusCampoWinAudit` e `WinAuditDuplicidadeEntry` de `winaudit.ts` (DRY).
  - Definir:
    ```ts
    export interface ChromeOSNormalizedInput { /* ... NormalizedEquipmentInput do spec ... */ }
    export interface ChromeOSPreviewRow {
      readonly indice: number
      readonly selecionado: boolean
      readonly ignorarDuplicidade: boolean
      readonly escolaPendente: boolean
      readonly candidatosEscola: readonly Escola[]    // (re)usar tipo Escola existente de Equipamentos.tsx ou criar EscolaResumo aqui
      readonly escolaResolvidaId?: string | null
      readonly equipamento: ChromeOSNormalizedInput
      readonly camposStatus: Readonly<Record<string, StatusCampoWinAudit>>
      readonly duplicidades: readonly WinAuditDuplicidadeEntry[]
      readonly bloqueioSerial: boolean
      readonly bloqueioSourceExternalId: boolean
      readonly avisos: readonly string[]
    }
    export interface ChromeOSPreviewResponse {
      readonly previewId: string
      readonly arquivoOriginal: string
      readonly tamanhoBytes: number | null
      readonly linhas: readonly ChromeOSPreviewRow[]
      readonly totalLinhas: number
      readonly totalValidas: number
      readonly totalEscolasPendentes: number
      readonly totalDuplicidadesBloqueantes: number
      readonly avisosGerais: readonly string[]
    }
    export interface ChromeOSConfirmarItem {
      readonly indiceLinha: number
      readonly selecionado: boolean
      readonly escolaResolvidaId: string | null
      readonly ignorarDuplicidade: boolean
      readonly overrides?: Readonly<Partial<ChromeOSNormalizedInput>>
    }
    export interface ChromeOSConfirmarPayload {
      readonly previewId: string
      readonly itens: readonly ChromeOSConfirmarItem[]
    }
    export interface ChromeOSConfirmarResultadoItem {
      readonly indiceLinha: number
      readonly status: 'SUCESSO' | 'CANCELADO' | 'ERRO'
      readonly equipamento?: Readonly<Record<string, unknown>> | null
      readonly erroMotivo?: string | null
    }
    export interface ChromeOSConfirmarResponse {
      readonly previewId: string
      readonly resultados: readonly ChromeOSConfirmarResultadoItem[]
      readonly totalSucesso: number
      readonly totalErros: number
      readonly totalCancelados: number
    }
    ```
- CRIAR: [frontend/src/services/importarChromeOS.ts](file:///C:/Sistemas/Inventario/frontend/src/services/importarChromeOS.ts)
  - `gerarPreviewChromeOS(file: File, escolaId?: string | null): Promise<ChromeOSPreviewResponse>` → FormData com `arquivo` e `escolaId`, POST para `/api/equipamentos/importar/chromeos/preview`.
  - `confirmarImportacaoChromeOS(payload: ChromeOSConfirmarPayload): Promise<ChromeOSConfirmarResponse>` → POST JSON para `/api/equipamentos/importar/chromeos/confirmar`.
  - Interceptor axios e tratamento de erros já existentes em `lib/axios.ts` se encarregam do CSRF e 401.

**Test Requirements (TR):**
- **TR-6.1 (rule):** `npx tsc --noEmit` no frontend passa (tipos consistentes).
- **TR-6.2 (rule):** Service importarChromeOS importa corretamente em Equipamentos.tsx sem TS errors.

---

### Task 7: Frontend UI — fluxo Chromebook em Equipamentos.tsx (Upload + Preview + Confirm)
**Prioridade:** high · **Dependências:** Task 6 · **ACs cobertos:** RF-07, RF-10, AC-R11, AC-U03

**Objetivo:** Adicionar o fluxo Chromebook lado a lado com o WinAudit na página Equipamentos, mantendo padrões de UI (wizard, badges, toasts, acessibilidade).

**Arquivos a alterar/criar:**
- ALTERAR: [frontend/src/pages/Equipamentos.tsx](file:///C:/Sistemas/Inventario/frontend/src/pages/Equipamentos.tsx)
  - Adicionar state análogo ao WinAudit mas com prefixo `cros`:
    ```ts
    type CrosFluxo = 'idle' | 'uploading' | 'review' | 'resultado'
    const [crosFluxo, setCrosFluxo] = useState<CrosFluxo>('idle')
    const [crosFile, setCrosFile] = useState<File | null>(null)
    const [crosPreview, setCrosPreview] = useState<ChromeOSPreviewResponse | null>(null)
    const [crosConfirmando, setCrosConfirmando] = useState(false)
    const [crosResultado, setCrosResultado] = useState<ChromeOSConfirmarResponse | null>(null)
    ```
  - Adicionar **abas/segments** no topo da área de importação (novo container `<div role="tablist">` com dois `<button role="tab">` "WinAudit" e "Chromebook CSV"; `aria-selected`, `aria-controls`).
  - Se aba Chromebook selecionada → renderizar componentes:
    - **Upload:** `input type=file accept=".csv"` + `Escola padrão` dropdown (mesmo `<select>` de escola); botão "Pré-visualizar importação". Valida extensão `.csv` e tamanho (5MB) cliente-side já no pick.
    - **Preview / Review:** `<table>` com cabeçalho acessível (`<thead>`, `<th scope="col">`). Colunas:
      - [x] Selecionado
      - Nome · Modelo · Serial
      - Usuario · Localização
      - Escola (dropdown inline se `escolaPendente`)
      - Badges: Serial Dup · DeviceId Dup · MAC Aviso
      - Ignorar Dup (só ADMIN, só se bloqueante)
      - Ações: "ver linha completa" (modal/drawer opcional)
      Paginação (reutilizar `<Pagination>` existente ou `pageSize=20` simples com botões anter./próx.).
      Ações em lote: `Selecionar todas`, `Desmarcar todas`, `Marcar pendências`.
      Botão primário: "Confirmar (N) itens selecionados".
    - **Resultado:** resumo com 3 contadores (sucesso/erro/cancelado) + lista expandida dos erros com motivo. Link "Ir para Auditoria".
  - Funções análogas: `onCrosFilePick`, `confirmarImportacaoChromeOS`, `clearCrosState`, `montarPayloadConfirmacaoPorLinha`.
  - **NÃO ALTERAR** o formulário de criação manual nem o fluxo WinAudit existente; novo código é aditivo no mesmo arquivo.
  - Complexidade: se o arquivo passar de ~2500 linhas após adições, extrair os componentes de UI do Chromebook para `frontend/src/components/imports/ChromeOSImportPanel.tsx` e manter apenas o state e o trigger em Equipamentos.tsx.

**(Opcional, se acionado acima)** CRIAR: `frontend/src/components/imports/ChromeOSImportPanel.tsx` — componente filho com props `{ escolas, userRole, onVoltar, onLimpar }` e state interno para paginação.

**Test Requirements (TR):**
- **TR-7.1 (rule):** Abas WinAudit/Chromebook alternam sem perder o state de cada uma.
- **TR-7.2 (rule):** Linha com escola pendente bloqueia o botão Confirmar até que um valor seja escolhido no dropdown daquela linha.
- **TR-7.3 (rule):** `tsc --noEmit` e `npm run lint` frontend passam.
- **TR-7.4 (rule):** Fluxo WinAudit permanece visual e funcionalmente idêntico a antes (regressão).
- **TR-7.5 (rubric):** Acessibilidade (tab order, labels, semântica, contraste). **Limiar ≥ 1 (auditoria rápida: todos elementos interativos têm aria-label/texto visível; tabela tem `<th scope>`; tabs respeitam `role=tablist/tab/tabpanel`).**

---

### Task 8: Integração auditoria + ajustes finais + compatibilidade WinAudit
**Prioridade:** medium · **Dependências:** Tasks 5 + 7 · **ACs cobertos:** AC-R12, AC-R13, AC-R14, AC-U02

**Objetivo:** Verificar se a tela Auditoria e demais partes automaticamente passam a listar os CSV; se não, ajustes mínimos para exibir `tipoArquivo`.

**Arquivos a alterar/criar:**
- LER: [frontend/src/pages/Auditoria.tsx](file:///C:/Sistemas/Inventario/frontend/src/pages/Auditoria.tsx).
  - Se a listagem já exibe `tipoArquivo` ou não filtra por ele, NÃO FAZER NADA (já coberto).
  - Se a tela filtra `tipoArquivo = 'HTML'` hardcoded, ALTERAR para aceitar também `'CSV'` ou remover o filtro.
  - Se usar endpoint específico WinAudit (`/api/equipamentos/importar/winaudit/logs`):
    - ALTERAR backend: em `listarLogsImportacoes` (WinAuditImportService.listarLogs) e `listarLogsImportacoes` controller — remover qualquer filtro implícito por `tipoArquivo` ou por versão de importador, para listar ambos. Se houver filtros query (`status`, `arquivoOriginalContem` etc.), mantê-los — eles funcionam para os dois.
- ALTERAR: [frontend/src/lib/axios.ts](file:///C:/Sistemas/Inventario/frontend/src/lib/axios.ts) (LER PRIMEIRO; provavelmente já injeta CSRF e trata erros — só conferir).
- Verificação de compatibilidade executar cenários:
  - (a) Regressão WinAudit completo: upload HTML → preview → confirmar → cria equipamento + ImportLog.
  - (b) Auditoria mostra novo tipo.
  - (c) Movimentações dos equipamentos Chromebook criados funcionam (entrada/saída).

**Test Requirements (TR):**
- **TR-8.1 (rule):** Tela Auditoria exibe importações CSV recém executadas com `tipoArquivo = CSV`.
- **TR-8.2 (rule):** Regressão WinAudit passa em cenário (a).
- **TR-8.3 (rule):** Equipamento tipo `CHROMEBOOK` criado via CSV aparece em listas e movimentações como qualquer outro.
- **TR-8.4 (rule):** `EquipamentoService.criarEquipamento` não teve API alterada (mesma assinatura `{ payload, usuario, prisma?, transactionClient? }`).

---

### Task 9: Executar lint/build/test finais + correções residuais
**Prioridade:** high · **Dependências:** Tasks 1..8 · **ACs cobertos:** todos (fechamento)

**Objetivo:** Rodar as pipelines locais de qualidade e corrigir o que quebrar (lint, tipos, build, tipagem Prisma client atualizada).

**Passos:**
1. Backend:
   - `cd backend ; npx prisma generate` (atualizar Prisma Client com enum e campos novos).
   - `npm run lint` ou `npx eslint src/ --ext .js`.
   - Se existir `npm test`, rodar. Caso contrário, rodar smoke test via curl / manual.
2. Frontend:
   - `cd frontend ; npx tsc --noEmit`.
   - `npm run lint` (ESLint + SonarLint regras).
   - `npm run build` (Vite).
3. Documentar em `review.md` (na fase Review) os resultados.

**Test Requirements (TR):**
- **TR-9.1 (rule):** `prisma generate` e `validate` OK.
- **TR-9.2 (rule):** Backend lint 0 errors, 0 warnings novos (apenas warnings preexistentes aceitos).
- **TR-9.3 (rule):** Frontend `tsc --noEmit` com 0 erros.
- **TR-9.4 (rule):** Frontend `vite build` gera saída em `dist/` sem erros.

---

## Ordem de execução e fatiamento por "Etapa" (conforme exigido)

Usuário pediu "IMPLEMENTE EM ETAPAS". A cada etapa, rodar o correspondente TR-*.

| **Etapa** | **Tasks** | **Verificação pós-etapa** |
|-----------|-----------|---------------------------|
| **Etapa 1 — Schema** | Task 1 | Prisma validate + migrate + TR-1.1..1.4 |
| **Etapa 2 — Utils puras (backend)** | Tasks 2, 3 | Lint backend + testes manuais de parser (TR-2, TR-3) |
| **Etapa 3 — Service + Controller + Rotas (backend)** | Tasks 4, 5 | Lint backend + curl/POSTman endpoints + TR-4, TR-5 |
| **Etapa 4 — Tipos + Service (frontend)** | Task 6 | `tsc --noEmit` frontend (TR-6) |
| **Etapa 5 — UI React (frontend)** | Task 7 | `tsc` + lint + build frontend (TR-7) |
| **Etapa 6 — Auditoria + Compat + Geral** | Tasks 8, 9 | Builds + regressão WinAudit + fumaça geral (TR-8, TR-9) |

---

## Rastreabilidade: AC → Task(s)

| Critério | Tarefa(s) |
|-----------|-----------|
| AC-R01 enum + campos nullable | 1 |
| AC-R02 validações upload CSV | 5 |
| AC-R03 preview 10 linhas, CB-*, tipo/status | 2, 4 |
| AC-R04 fabricante/proc./mem. nulos | 2 |
| AC-R05 duplicidade bloqueante não-ADMIN | 3, 4 |
| AC-R06 ADMIN ignora duplicidade | 4, 7 |
| AC-R07 escola pendente bloqueia confirmação | 4, 7 |
| AC-R08 batch 20 cria 18 cancela 2 | 4 |
| AC-R09 ImportLog CSV campos preenchidos | 4 |
| AC-R10 idempotência confirmar | 4 |
| AC-R11 UI 3 passos + 2 abas | 7 |
| AC-R12 Auditoria mostra CSV | 8 |
| AC-R13 EquipamentoService API preserved | 4, 8 |
| AC-R14 WinAudit endpoints preserved | 3, 5, 8 |
| AC-U01 separação camadas + S3776 | 2, 4 |
| AC-U02 compatibilidade WinAudit | 3, 5, 8 |
| AC-U03 acessibilidade UI | 7 |
| AC-U04 observabilidade logs | 4, 5 |
| AC-U05 lote best-effort 97/3 | 4 |
