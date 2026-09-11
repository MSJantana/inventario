# Especificação: Importar Chromebook via CSV do Google Admin Console

## Problema
O 7Inventory atualmente suporta importação de equipamentos de desktop/notebook via relatório WinAudit (HTML). Falta um caminho para inventariar Chromebooks gerenciados via Google Admin Console, que exporta seus dados em formato CSV com campos específicos (deviceId, annotatedAssetId, orgUnitPath etc.).

## Usuários
- **Administradores (ADMIN)** — podem importar para qualquer escola e sobrescrever bloqueios de duplicidade.
- **Gestores (GESTOR) / Técnicos (TECNICO)** — podem importar apenas para escolas vinculadas.

## Objetivos
1. Aceitar arquivos `.csv` exportados do Google Admin Console (ChromeOS devices) e processá-los em lote.
2. Produzir uma **pré-visualização (preview)** com uma linha por Chromebook, indicando campos encontrados, possíveis duplicidades (serial / sourceExternalId) e alertas de MAC.
3. Permitir que o usuário **selecione quais linhas importar**, corrija pendências (ex.: Escola não resolvida via `orgUnitPath`) e **confirme** para criar apenas os itens selecionados.
4. Criar um **objeto normalizado compartilhado** com o importador WinAudit existente, de forma que ambos produzam a mesma estrutura intermediária antes de gravar no banco.
5. Preservar **metadados Google completos em JSON** para auditoria futura.
6. Registrar **ImportLog (ImportacaoWinAudit)** por item criado com todos os campos solicitados (usuário, data/hora, arquivo, equipamento, IP, campos encontrados/importados, duração, versão do importador, tipo e tamanho do arquivo), mantendo 100% de compatibilidade com o WinAudit.
7. Não inventar Fabricante, Processador nem Memória — esses campos devem permanecer `null` / vazio para Chromebooks importados via CSV.

## Não-Goals (Fora do Escopo)
- Alterar campos ou estrutura do WinAudit existente.
- Criar uma tela de configuração / CRUD de mapeamento `orgUnitPath → Escola` nesta fase (o mapeamento será resolvido no preview com seleção manual e heurística por nome/sigla).
- Autenticação OAuth ou integração direta com a API Google Admin — apenas CSV local exportado manualmente.
- Atualização em massa de registros existentes — o importador apenas cria novos registros; duplicidades são bloqueadas ou exigem confirmação de ADMIN.

---

## Requisitos Funcionais (RF)

### RF-01 — Upload e parsing do CSV Google Admin
- O endpoint `POST /api/equipamentos/importar/chromeos/preview` recebe um `multipart/form-data` com:
  - Campo `arquivo`: arquivo `.csv` (mime permitidos: `text/csv`, `application/csv`, `text/plain`, `application/octet-stream`).
  - Campo `escolaId` opcional (escola padrão quando `orgUnitPath` não puder ser mapeado).
- O parser deve reconhecer as seguintes colunas (case-insensitive, com fallback para nomes alternativos comuns no Admin Console):
  - `deviceId` / `Device ID` / `device id`
  - `serialNumber` / `Serial Number` / `serial`
  - `model` / `Model`
  - `osVersion` / `OS version` / `chromeOS version`
  - `orgUnitPath` / `Org Unit Path` / `orgUnit`
  - `provisionStatus` / `Provision Status` / `status`
  - `annotatedAssetId` / `Asset ID` / `annotatedAssetID`
  - `annotatedUser` / `User` / `annotated user`
  - `annotatedLocation` / `Location` / `annotated location`
  - `annotatedNotes` / `Notes` / `annotated notes`
  - `ethernetMacAddress` / `Ethernet MAC` / `ethernet MAC address`
  - `macAddress` / `MAC Address` / `WiFi MAC` / `wifi MAC address`
  - `lastPolicySyncMs` / `Last Sync` / `last policy sync` (número epoch ms ou ISO date)
  - `autoUpdateExpiration` / `Auto Update Expiration` / `au expiration` (número epoch ms ou ISO date)
- Arquivos sem ao menos `serialNumber` (ou `deviceId` como fallback serial) ou `model` são rejeitados no preview com status `ERRO` no ImportLog.
- Tamanho máximo do arquivo: padrão `WINAUDIT_MAX_MB` (5 MB por padrão), reutilizando a mesma infraestrutura do `multer` mas com extensões `.csv` permitidas.

### RF-02 — Objeto normalizado compartilhado
- O CSV parseado é convertido para um **objeto normalizado** com a mesma estrutura base que o WinAudit:
  ```
  NormalizedEquipmentInput {
    nome: string
    patrimonio: string | null
    usuarioNome: string | null
    escolaId: string | null
    tipo: 'CHROMEBOOK'
    status: 'DISPONIVEL'
    modelo: string
    serial: string
    localizacao: string | null
    macaddress: string | null
    observacoes: string | null
    fabricante: null          // não inventar
    processador: null         // não inventar
    memoria: null             // não inventar
    dataAquisicao: string     // ISO date; se não houver, usar hoje
    sourceExternalId: string | null   // deviceId do Google
    importMetadata: {         // metadados Google em JSON
      tipoFonte: 'CHROMEOS_CSV'
      versaoImportador: string
      camposOriginais: Record<string, unknown>
      osVersion: string | null
      orgUnitPath: string | null
      provisionStatus: string | null
      lastPolicySync: string | null
      autoUpdateExpiration: string | null
      ethernetMacAddress: string | null
      wifiMacAddress: string | null
    }
  }
  ```
- O WinAudit já produz estruturas compatíveis com `EquipamentoService.prepararPayloadEquipamento`; o CSV ChromeOS deve passar pelo mesmo `prepararPayloadEquipamento` antes de gravar.

### RF-03 — Mapeamento de campos 7Inventory
Para cada linha do CSV, aplicar estritamente as regras abaixo:
| Campo 7Inventory   | Fonte (prioridade / fallback)                                                                 |
|---------------------|-----------------------------------------------------------------------------------------------|
| **Nome**            | `CB-{annotatedAssetId}`; se vazio → `CB-{serialNumber}`                                       |
| **Patrimonio**      | `annotatedAssetId` (ou nulo)                                                                  |
| **Usuario**         | `annotatedUser`                                                                               |
| **Escola**          | `orgUnitPath` via **tabela de mapeamento heurística** (match nome/sigla); se falhar → `null` e marcar "Escola pendente" |
| **Tipo**            | Sempre `CHROMEBOOK` (enum `TipoEquipamento`)                                                  |
| **Status**          | Sempre `DISPONIVEL`                                                                           |
| **Modelo**          | `model`                                                                                       |
| **Serial**          | `serialNumber` (normalizado por `normalizarSerial`)                                           |
| **Localizacao**     | `annotatedLocation`                                                                           |
| **MAC**             | `macAddress` (WiFi); se vazio → `ethernetMacAddress` (normalizado por `normalizarMacEntrada`)|
| **Observacoes**     | `annotatedNotes` (concatenar também `osVersion`, `provisionStatus`, `autoUpdateExpiration` se presentes, com prefixo `[ChromeOS]`) |
| **Fabricante / Proc. / Mem.** | **Não preencher** — preservar nulos                                                |
| **sourceExternalId**| `deviceId`                                                                                    |
| **importMetadata**  | JSON bruto com todos os campos originais da linha + metadados extraídos                       |

### RF-04 — Resolução de Escola via orgUnitPath (tabela de mapeamento)
- **Heurística de match**: dado `orgUnitPath` (ex: `/Escolas/EMEF Prof. João Silva/Alunos`):
  1. Extrair segmentos do caminho (split por `/`, remover vazios).
  2. Para cada segmento, tentar match exato ou parcial (contém) contra `Escola.nome` e `Escola.sigla` (case-insensitive, normalizando acentos via `localeCompare pt-BR`).
  3. Se houver exatamente 1 candidato, atribuir `escolaId` automaticamente.
  4. Se houver 0 ou ≥ 2 candidatos → marcar a linha com `escolaPendente: true` e listar os candidatos (até 5) no preview. O usuário deve selecionar uma escola durante a etapa de revisão.
- Se o usuário enviou `escolaId` padrão no upload, usá-lo apenas para as linhas onde a heurística não encontrou nada e o usuário não selecionar nada manualmente.

### RF-05 — Validação de duplicidades
- **Duplicidade por serial (bloqueante)**: consultar `Equipamento.serial === serialNormalizado`. Se existir e o status não for `DESCARTADO` → marcar `bloqueioSerial: true`.
- **Duplicidade por sourceExternalId (deviceId) (bloqueante)**: consultar `Equipamento.sourceExternalId === deviceId`. Se existir → marcar como duplicidade forte.
- **Duplicidade por MAC (alerta)**: consultar `Equipamento.macaddress === macNormalizado`. Se existir → marcar como alerta (não bloqueia, só mostra aviso).
- Regras de confirmação:
  - Usuários não-ADMIN **não** podem criar itens com duplicidade bloqueante.
  - ADMIN pode criar se marcar `ignorarDuplicidade: true` por item.

### RF-06 — Pré-visualização (preview)
- `POST /api/equipamentos/importar/chromeos/preview` retorna:
  ```
  ChromeOSPreviewResponse {
    previewId: string                // ID do ImportLog (status PREVIEW_GERADO)
    arquivoOriginal: string
    tamanhoBytes: number | null
    linhas: ChromeOSPreviewRow[]     // uma por linha CSV válida
    totalLinhas: number
    totalValidas: number
    totalEscolasPendentes: number
    totalDuplicidadesBloqueantes: number
    avisosGerais: string[]
  }
  ```
- Cada `ChromeOSPreviewRow` contém: índice, o objeto normalizado, `camposStatus` (mesmo enum `StatusCampoWinAudit`), `escolaPendente`, `candidatosEscola`, `duplicidades`, `avisos`, flag `selecionado: true` padrão, flag `ignorarDuplicidade: false`.
- Todo o preview é registrado em `ImportacaoWinAudit` com status `PREVIEW_GERADO` **por linha** (um registro por Chromebook, não um por arquivo) — ou um registro mestre por arquivo + itens vinculados. Vide decisão AC-01.

### RF-07 — Seleção de linhas e resolução de pendências
- A tela de importação (frontend) mostra uma tabela paginada com as linhas do preview.
- Cada linha tem:
  - Checkbox de seleção (padrão: marcado se não há bloqueios).
  - Dropdown de Escola (se `escolaPendente`) obrigatório antes de confirmar.
  - Badges de status por campo (ENCONTRADO / NÃO_ENCONTRADO / POSSIVEL_DUPLICIDADE / INVALIDO).
  - Lista de duplicidades detectadas.
  - Checkbox "Ignorar duplicidade" (visível só para ADMIN e apenas se houver bloqueio).
- Ações em lote no topo: Selecionar todas / Desmarcar todas / Selecionar só pendentes.

### RF-08 — Confirmação (criação)
- `POST /api/equipamentos/importar/chromeos/confirmar` recebe:
  ```
  {
    previewId: string
    itens: [
      {
        indiceLinha: number
        selecionado: boolean
        escolaResolvidaId: string | null    // sobrescreve heurística
        ignorarDuplicidade: boolean
        // Overrides opcionais dos campos normalizados (ex.: usuário corrigiu nome)
        overrides?: Partial<NormalizedEquipmentInput>
      }, ...
    ]
  }
  ```
- Para cada item **selecionado**:
  1. Revalida duplicidades (não confiar no preview — pode estar desatualizado).
  2. Aplica `escolaResolvidaId` e `overrides`.
  3. Valida campos obrigatórios (`nome`, `tipo`, `modelo`, `serial`, `dataAquisicao`, `usuarioNome`).
  4. Se `usuarioNome` vier vazio → preencher com `annotatedUser` ou, como último recurso, literal `"Chromebook (sem usuário)"` (não deixar vazio, pois é campo obrigatório em `EquipamentoService`).
  5. Criar via transação: `EquipamentoService.criarEquipamento` + atualização do `ImportacaoWinAudit` correspondente para status `SUCESSO` e vínculo com `equipamentoId`.
- Itens não selecionados → marcar seus registros `ImportacaoWinAudit` como `CANCELADO`.
- Falha em um item NÃO cancela os demais (comportamento "best effort"); a resposta contém um array `resultados[]` com status por item e `erroMotivo` quando aplicável.

### RF-09 — ImportLog (reutilização do model `ImportacaoWinAudit`)
Reutilizar 100% o model existente, preenchendo:
| Campo ImportLog              | Fonte                                                                 |
|------------------------------|-----------------------------------------------------------------------|
| `usuarioId`                  | `req.usuario.id` (JWT)                                                |
| `dataHora`                   | default(now())                                                        |
| `arquivoOriginal`            | `req.file.originalname`                                               |
| `tamanhoBytes`               | `req.file.size`                                                       |
| `tipoArquivo`                | `'CSV'` (diferencia de 'HTML' do WinAudit)                            |
| `status`                     | PREVIEW_GERADO / SUCESSO / CANCELADO / ERRO                           |
| `equipamentoId`              | após criar, vincular ID do Equipamento (apenas SUCESSO)               |
| `camposEncontrados`          | mapa `{ campo: true/false }` ou `StatusCampoWinAudit` (compatível)    |
| `camposNaoEncontrados`       | lista de strings                                                      |
| `duplicidadesDetectadas`     | array `WinAuditDuplicidadeEntry[]` (mesmo formato)                    |
| `erros` / `erroMotivo`       | mensagens de erro por linha                                           |
| `dadosBrutos`                | JSON com `NormalizedEquipmentInput.importMetadata` + colunas originais|
| `escolaId`                   | escola final atribuída                                                |
| `ipOrigem`                   | `extrairIpOrigem(req)` (mesma rotina do WinAudit)                     |
| `versaoImportador`           | `process.env.CHROMEOS_IMPORTER_VERSION || '1.0.0'`                    |
| `duracaoMs`                  | `Date.now() - inicioMs` por item                                      |
| `qtdCamposEncontrados` / `qtdCamposImportados` | contagem conforme `contarCamposPorStatus` |

Para manter compatibilidade total com o WinAudit, **nenhum campo existente é renomeado ou removido**.

### RF-10 — Fluxo UI (frontend)
Integração na página existente `Equipamentos.tsx`, lado a lado com o WinAudit:
1. No botão/área de importação, adicionar uma segunda aba ou seletor: **"WinAudit (.html)"** e **"Chromebook Google Admin (.csv)"**.
2. Fluxo Chromebook:
   - **Passo 1 (Upload)**: `input type=file accept=".csv"` + opcional `Escola padrão` dropdown.
   - **Passo 2 (Preview / Seleção)**: tabela paginada com linhas, checkbox de seleção, dropdown de Escola para pendências, botão "Confirmar importação dos selecionados".
   - **Passo 3 (Resultado)**: lista resumo de sucessos / falhas por linha, link para auditoria.
3. O formulário de "Criar Equipamento" manual permanece inalterado.
4. A tela de **Auditoria** (`Auditoria.tsx`) já lista `ImportacaoWinAudit`; ela automaticamente passará a mostrar também as importações CSV ChromeOS (campo `tipoArquivo = CSV`).

### RF-11 — Regras de acesso (autenticação e autorização)
- Ambos os endpoints exigem `auth` (JWT Bearer) + `csrfProtect`.
- `permitRoles('ADMIN', 'GESTOR', 'TECNICO')` — mesmos papéis do WinAudit.
- Respeitar `hasSchoolAccess`: GESTOR/TECNICO só pode criar itens cuja `escolaId` final esteja em `escolasPermitidas`.

### RF-12 — Tratamento de erros e logs
- Padrão do `errorHandler.js`:
  - Erros de validação → `400` com `code` no estilo `CHROMEOS_CSV_MISSING_SERIAL`, `CHROMEOS_CSV_PENDING_SCHOOL`, etc.
  - Erros Prisma/P2002 (unique) → `409` com `'Já existe um equipamento com este serial.'` (padrão existente).
  - Erros de arquivo (extensão, tamanho) → `400 / 413` com `code` no mesmo padrão do `winauditUpload`.
- **Logs de aplicação**: usar `req.log.info / error` (Pino) com prefixo `[chromeos:preview]` e `[chromeos:confirmar]`; anexar `requestId`, `usuarioId`, `previewId`, `linhaIdx`.

---

## Requisitos Não-Funcionais (RNF)

- **RNF-01 Complexidade Cognitiva (S3776)**: funções > 15 devem ser decompostas em subfunções puras (mesmo padrão da refatoração recente do WinAudit). Usar ordenação `localeCompare('pt-BR')` em listagens alfabéticas (S2871).
- **RNF-02 Normalização de tipos unknown**: antes de `String()` aplicar narrowing explícito `typeof v === 'string'` (S6551). Usar `v || undefined` em vez de ternários de default (S6644).
- **RNF-03 Campos opcionais de UI / acessibilidade**: usar hierarquia correta de headings, ARIA labels em tabelas e diálogos modais, manter contraste e mensagens de toast descritivas.
- **RNF-04 Performance**: para CSVs grandes (até ~1000 linhas), o preview deve concluir em < 10 s. Todo o parsing e normalização deve ocorrer em memória; nenhuma escrita no banco além dos `ImportacaoWinAudit` durante o preview.
- **RNF-05 Transações**: cada item confirmado é criado em sua própria transação para isolar falhas (um erro não afeta os demais).
- **RNF-06 Idempotência**: confirmar a mesma combinação `previewId + índiceLinha` duas vezes não duplica o equipamento (valida `ImportacaoWinAudit.status !== PREVIEW_GERADO` antes de criar).

---

## Restrições, Dependências e Premissas

### Restrições
- **Compatibilidade WinAudit**: NÃO renomear `ImportacaoWinAudit`, NÃO alterar payloads ou rotas existentes. Tudo novo deve ser aditivo.
- `TipoEquipamento.CHROMEBOOK` precisa ser adicionado no enum Prisma (migration); `Equipamento.tipo` atualmente é obrigatório e valida contra esse enum.
- Campos opcionais novos no Equipamento (`sourceExternalId`, `importMetadata`) devem ser `nullable` para não quebrar criação manual.

### Dependências
- Prisma ORM + MySQL (existente). Migration nova para os campos novos e enum novo.
- `multer` (já instalado) para upload CSV.
- Parser CSV: avaliar se adicionamos `csv-parse` (popular, robusto) ou implementar parser manual RFC-4180 leve. Verificar `package.json` antes; se não existir e preferirmos zero novas dependências, fazer parser manual com tratamento de aspas e BOM UTF-8.
- React + TypeScript + Tailwind (existentes).

### Premissas
- O Admin Console exporta CSV com separador vírgula, aspas duplas opcionais e BOM UTF-8; encoding padrão UTF-8.
- `deviceId` é estável e único por Chromebook na tenancy Google.
- `serialNumber` no Google corresponde ao `Equipamento.serial` que o 7Inventory usa como unique.

### Questões Abertas (Open Questions)
1. **Q1 (decisão AC-01)**: O `ImportLog` é 1 por arquivo (mestre) com 1 `ImportacaoWinAudit` filho por linha via `dadosBrutos`, ou 1 `ImportacaoWinAudit` por linha (vínculo por `previewId` compartilhado)? **Resposta esperada**: 1 `ImportacaoWinAudit` POR LINHA, todos com o mesmo `arquivoOriginal` e um `previewId` comum armazenado em `dadosBrutos.previewId` ou em um novo campo opcional. (Isso facilita a auditoria item a item e reutiliza 100% o model existente.)

---

## Critérios de Aceitação (Acceptance Criteria)

### Rule (condição binária verificável)
- **AC-R01**: O enum `TipoEquipamento` no Prisma contém `CHROMEBOOK` e o model `Equipamento` contém `sourceExternalId String?` e `importMetadata Json?` nullable. Equipamentos criados manualmente e WinAudit continuam funcionando sem esses campos.
- **AC-R02**: `POST /api/equipamentos/importar/chromeos/preview` retorna HTTP 400 + `code=CHROMEOS_INVALID_EXTENSION` para arquivos não-CSV e 413 para > WINAUDIT_MAX_MB.
- **AC-R03**: Dado um CSV com 10 linhas e todas as colunas, o preview retorna 10 `ChromeOSPreviewRow`. O `dados.nome` de cada linha começa com `CB-` e o `dados.tipo` é `CHROMEBOOK`. `dados.status` é `DISPONIVEL`.
- **AC-R04**: Campos `fabricante`, `processador`, `memoria` no objeto normalizado são `null` ou vazios para o importador ChromeOS e NÃO aparecem como "encontrados" em `camposStatus`.
- **AC-R05**: Duas linhas com mesmo `serialNumber` de um equipamento já no banco (status ≠ DESCARTADO) resultam em `bloqueioSerial: true` e item não selecionável por padrão. Usuário não-ADMIN ao tentar confirmar recebe HTTP 409.
- **AC-R06**: ADMIN pode confirmar linha bloqueada marcando `ignorarDuplicidade: true`; equipamento é criado e ImportLog recebe `status=SUCESSO`.
- **AC-R07**: Linha com `orgUnitPath` sem match recebe `escolaPendente=true`. Confirmar sem `escolaResolvidaId` retorna HTTP 400 para aquela linha (as demais prosseguem).
- **AC-R08**: `POST /api/equipamentos/importar/chromeos/confirmar` para CSV de 20 linhas (18 selecionadas, 2 não) → 18 `Equipamento` novos criados + 18 `ImportacaoWinAudit.status = SUCESSO` + 2 `CANCELADO`. Cada SUCESSO tem `equipamentoId` preenchido.
- **AC-R09**: ImportLog SUCESSO contém `tipoArquivo = 'CSV'`, `versaoImportador = '1.0.0'`, `ipOrigem`, `duracaoMs`, `qtdCamposEncontrados`, `qtdCamposImportados`. Todos os campos originais da linha estão em `dadosBrutos.importMetadata`.
- **AC-R10**: Rerodar `confirmar` com mesmo `previewId + índiceLinha` é idempotente (não cria segundo equipamento) e retorna o resultado original.
- **AC-R11**: Roteamento do frontend: a página Equipamentos mostra duas opções de importação; fluxo Chromebook tem 3 passos e confirmação exibe resumo com contadores de sucesso/erro.
- **AC-R12**: A tela Auditoria mostra imports CSV ChromeOS sem necessidade de alteração (pois reutiliza `ImportacaoWinAudit`), com `tipoArquivo=CSV` visível.
- **AC-R13**: `EquipamentoService.criarEquipamento` continua sem alterações de API. O objeto normalizado ChromeOS é compatível com `prepararPayloadEquipamento`.
- **AC-R14**: Nenhum campo existente do WinAudit foi modificado em schema ou payload. `POST /api/equipamentos/importar/winaudit/preview` e `/confirmar` retornam idêntico aos de antes.

### Rubric (dimensão avaliativa 0-2)
- **AC-U01 Qualidade estrutural (0-2)**: O importador ChromeOS segue a mesma arquitetura em camadas do WinAudit (Controller → Service → utils/*). Extração de CSV, normalização, detecção de duplicidades e montagem de payload estão em funções puras separadas. Complexidade por função ≤ 15 (S3776). **Limiar: ≥ 2**
- **AC-U02 Compatibilidade WinAudit (0-2)**: Nenhum teste / comportamento WinAudit quebra; endpoints, tipos, schemas existentes preservados. Code review consegue verificar sem observar nenhuma remoção. **Limiar: ≥ 2**
- **AC-U03 Acessibilidade e UX (0-2)**: Fluxo tem hierarquia h1/h2/h3, aria-labels nos botões/tabelas, feedback visual claro (toasts, cores, badges). Usuário consegue completar importação de 50 linhas sem recorrer a ajuda. **Limiar: ≥ 1**
- **AC-U04 Observabilidade (0-2)**: Logs Pino cobrem etapas preview, parsing, validação, e criação por item com `requestId`, `previewId`, `linhaIdx`. Tratamento de erro em camada HTTP retorna `code`, `statusCode` e mensagem em português. **Limiar: ≥ 2**
- **AC-U05 Tratamento de erros de importação em lote (0-2)**: 100 itens com 3 falhas no meio → 97 criados, 3 com erroMotivo nítido no ImportLog e no response de confirmação. Nenhum rollback em cascata. **Limiar: ≥ 2**
