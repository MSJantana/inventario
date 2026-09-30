# Tasks: Botão Formatação (Movimentações) + status FORMATADO

**Spec vinculado:** `.trae/specs/botao-formatacao-movimentacoes-status-formatado/spec.md`
**Data:** 2026-09-29

---

## Task 1: Prisma schema + migration (Enum FORMATACAO e FORMATADO + runtime driver)

**Prioridade:** high
**Status:** pending
**Cobertura AC:** AC-3 (base enum), AC-5 (equipa update), AC-6 (transicao status)
**Dependências de:** —

### Descrição
Alterar enums `StatusEquipamento` e `TipoMovimento` no `backend/prisma/schema.prisma`. Criar migration SQL idempotente (ALTER TABLE MODIFY COLUMN) com runtime driver `.mjs` aplicável em 10.12.0.9 (se Prisma `_prisma_migrations` sujo não de rodar migrate deploy). Depois rodar `npx prisma generate` local para atualizar client.

### Subpassos
1. **schema.prisma enum StatusEquipamento** acrescentar `FORMATADO` após `EMPRESTADO` antes `DOADO`.
2. **schema.prisma enum TipoMovimento** acrescentar `FORMATACAO` após `MANUTENCAO_RETORNO` antes `EMPRESTIMO`.
3. Criar migration folder `backend/prisma/migrations/YYYYMMDDHHMMSS_add_formatado_status_and_formatacao_tipo_movimento/`
   - `migration.sql` com 2 ALTER TABLE MODIFY COLUMN (ENUMs antigos + novos valores) idempotentes OU usar stored procedure.
   - Alternativa: usar script `backend/prisma/apply-formatado-enum-runtime.mjs` mysql2 driver (igual pattern apply-configuracao-geral-chromebook) caso host não aceite migrate.
4. Rodar `cd backend && npx prisma generate` local.
5. Backup do host: antes de rodar runtime driver em 10.12.0.9 aplicar dump.

### Test Requirements
- **TR-1.1 (rule):** `DESC equipamento` e `DESC movimentacao` no host DEV/HML mostram ENUM contendo FORMATADO/FORMATACAO respectivamente.
  - Evidence: `mysql -e "SHOW COLUMNS FROM equipamento LIKE 'status';"` + mesmo p/ `movimentacao.tipoMovimento`.
- **TR-1.2 (rule):** Prisma client gerado sem erros → `Prisma.StatusEquipamento.FORMATADO` existe; `Prisma.TipoMovimento.FORMATACAO` existe.
  - Evidence: grep `FORMATADO` e `FORMATACAO` em `backend/node_modules/.prisma/client/index.d.ts` após generate.
- **TR-1.3 (rule):** Migration runtime driver é idempotente (rodar 2x não crasha).
  - Evidence: rodar o driver 2 vezes seguidas, exit 0 ambas.

**Completion Evidence:** (preencher após completar)

---

## Task 2: Backend — regras transição status + montar update formatacao + endpoint

**Prioridade:** high
**Status:** pending
**Cobertura AC:** AC-4 (rejeita campos extra), AC-5 (update nome+status), AC-6 (EM_MANUTENCAO/EMPRESTADO bloqueado)
**Dependências de:** Task 1

### Descrição
Atualizar `movimentacaoStatus.js` (transição) e `MovimentacaoService.js` (montarUpdatePorTipo + criarFormatacao). Depois endpoint em `movimentacoes.js` route + `movimentacoesController.js` handler.

### Subpassos
1. **backend/src/utils/movimentacaoStatus.js**
   - `TIPO_PARA_STATUS_ALVO.FORMATACAO = 'FORMATADO'`
   - `STATUS_EQUIPAMENTO` acrescentar 'FORMATADO'
   - `REGRA_ESPECIAL.FORMATACAO = (statusAtual) => ['DISPONIVEL','EM_USO','RESERVADO','FORMATADO'].includes(statusAtual)` — retorna false para EM_MANUTENCAO/EMPRESTADO/DOADO/DESCARTADO.
2. **backend/src/services/MovimentacaoService.js**
   - Acrescentar `FORMATADO` e `FORMATACAO` a comentários e validações de strings se houver (ex: `STATUS_EQUIPAMENTO_VALIDOS` array L110 já existe → inserir 'FORMATADO').
   - Helper `montarUpdateFormatacao` (semelhante a montarUpdateAjuste mas só 1 campo nome):
     ```
     const montarUpdateFormatacao = (equipamentoAtual, dadosMov) => {
       const aj = typeof dadosMov.ajusteEquipamento === 'object' && dadosMov.ajusteEquipamento
       if (!aj) throw classErrorApp('ajusteEquipamento é obrigatório em FORMATAÇÃO.', 400)
       const keys = Object.keys(aj)
       if (!keys.includes('nome')) throw classErrorApp('Campo ajusteEquipamento.nome é obrigatório em FORMATAÇÃO.', 400)
       const extra = keys.filter(k => k !== 'nome')
       if (extra.length > 0) throw classErrorApp('FORMATAÇÃO só permite alterar ajusteEquipamento.nome. Campos proibidos: ' + extra.join(', '), 400, 'FORMATACAO_CAMPOS_EXTRA')
       const nomeNovo = String(aj.nome ?? '').trim()
       if (!nomeNovo) throw classErrorApp('ajusteEquipamento.nome não pode estar vazio.', 400)
       if (nomeNovo.length > 255) throw classErrorApp('Nome excede 255 caracteres.', 400)
       if (nomeNovo === String(equipamentoAtual.nome ?? '').trim()) return {}
       return { nome: nomeNovo }
     }
     ```
   - `montarUpdatePorTipo` acrescentar `case 'FORMATACAO': return montarUpdateFormatacao(equipamentoAtual, dadosMov)` antes default.
   - `criarFormatacao` export:
     ```
     export const criarFormatacao = async (body, usuario) => {
       const dados = normalizarDadosMov(body)
       dados.tipoMovimento = 'FORMATACAO'
       return criarMovimentacao(dados, usuario)
     }
     ```
   - Export `criarFormatacao` adicionado ao obj `MovimentacaoService` (L806).
3. **backend/src/controllers/movimentacoesController.js** criar `postFormatacao` handler (pattern `postManutencaoEnvio`): pega body + req.usuario → chama `criarFormatacao` → retorna 201 JSON { ok:true, movimentacao, equipamentoAtualizado }.
4. **backend/src/routes/movimentacoes.js** acrescentar rota após /manutencao/retorno:
   `router.post('/formatacao', auth, csrfProtect, permitRoles('ADMIN', 'GESTOR', 'TECNICO'), postFormatacao)`
5. Validação sintática: `node --check` nos 4 arquivos alterados (MovimentacaoService, movimentacaoStatus, movimentacoes route, movimentacoesController).

### Test Requirements
- **TR-2.1 (rule):** POST /formatacao EM_MANUTENCAO → 400 TRANSICAO_INVALIDA (AC-6).
  - Evidence: curl/postman request + response body JSON.
- **TR-2.2 (rule):** POST /formatacao body `{equipamentoId:<idOK>, ajusteEquipamento:{nome:"OK",status:"DISPONIVEL"}}` → 400 FORMATACAO_CAMPOS_EXTRA (AC-4).
  - Evidence: resposta HTTP 400 contendo `"FORMATACAO_CAMPOS_EXTRA"`.
- **TR-2.3 (rule):** POST /formatacao sucesso (nome muda) → equipamento.status=FORMATADO e nome atualizado (AC-5).
  - Evidence: SQL SELECT id, status, nome FROM equipamento WHERE id=...; SELECT id, tipoMovimento FROM movimentacao WHERE equipamentoId=... ORDER BY id DESC LIMIT 1.
- **TR-2.4 (rule):** Permissões USUARIO → 403 (RNF-2).
  - Evidence: req com role USUARIO retorna 403.

**Completion Evidence:** (preencher após completar)

---

## Task 3: Frontend Movimentacoes.tsx — novo tipo FORMATAÇÃO + formulário com Nome apenas

**Prioridade:** high
**Status:** pending
**Cobertura AC:** AC-1 (3 itens grupo), AC-2 (1 campo nome), AC-3 (nome vazio bloqueado), AC-10 (UX grupo ordem)
**Dependências de:** Task 2

### Subpassos
1. **TIPOS_COMPLETOS** → acrescentar `'FORMATACAO'`
2. **CategoriaTipo** (já vai passar; MANUTENCAO existe)
3. **TIPOS_FORMULARIO** item (posição 3 após MANUTENCAO_RETORNO):
   ```
   { value: 'FORMATACAO', label: '🖥️ Formatação', categoria: 'MANUTENCAO',
     descricao: 'Reinstala SO, renomeia ativo e marca status Formatado',
     endpoint: '/api/movimentacoes/formatacao',
     statusEquipamentoPermitidos: ['DISPONIVEL','EM_USO','RESERVADO','FORMATADO'] }
   ```
4. **CLASSE_BADGE_TIPO**: `FORMATACAO: 'bg-cyan-100 text-cyan-900'`
5. **getTipoLabel/mapeamento**: caso exista centralizado; senão tratar no render. Garantir que "FORMATACAO" label exiba "Formatação".
6. **Mensagens ajuda filtro equipamentos** (L925): acrescentar `case 'FORMATACAO': return 'Exibindo equipamentos exceto em manutenção e emprestados/descartados/doados'`.
7. **Filtro equipamentos** (após MANUTENCAO_ENVIO filter): `case 'FORMATACAO':` mesma regra MANUTENCAO_ENVIO (exceto EM_MANUTENCAO/EMPRESTADO/DOADO/DESCARTADO).
8. **Montar payload FORMATAÇÃO**:
   - Form state novo `fFormatacao: { nome: string }` com `useState` inicializado ao selecionar equipamento com valor equipamento.nome (trim).
   - Campo `<input>` controlado, validação onChange não vazio maxlength 255.
   - Mensagem ajuda label `<small>`.
   - `montarPayloadFormatacao(ctx)` semelhante a `montarPayloadAjuste`: `base + { ajusteEquipamento: { nome: ctx.fFormatacao.nome.trim() } }`
   - `switch (opcao.value)` case FORMATAÇAO chamar payload helper.
   - Validar `fFormatacao.nome.trim().length === 0` → bloquear submit, mensagem no formulário (AC-3).
9. Renderização condicional forms: ao selecionar FORMATAÇÃO → exibir Section com label Nome e input apenas, não mostrar ajusteEquipamento 12 campos.

### Test Requirements
- **TR-3.1 (rule):** DOM select grupo MANUTENCAO mostra 3 opções (Envio, Retorno, Formatação). AC-1.
  - Evidence: browser DevTools Console `$$('.grupo-manutencao li').length === 3` ou equivalente.
- **TR-3.2 (rule):** Formulário exibe 1 `<input>` nome e NÃO exibe outros 11 campos do ajuste. AC-2.
  - Evidence: DOM query `count('input[name != "nome"], select, textarea') === apenas padrões (Data, Observações, Responsável)`.
- **TR-3.3 (rule):** Nome vazio + clique Salvar → toast/erro e submit bloqueado. AC-3.
  - Evidence: sem requisição fetch para backend (aba Network XHR vazio).
- **TR-3.4 (rule):** Submit sucesso → dialog fecha, toast sucesso, tabela movimentações recarrega com novo item Formatação.
  - Evidence: nova linha aparecendo com tipo "Formatação".

**Completion Evidence:** (preencher após completar)

---

## Task 4: Frontend Equipamentos.tsx + App.tsx What's New 1.2.8? ou hotfix What's New Extra badge FORMATADO

**Prioridade:** medium
**Status:** pending
**Cobertura AC:** AC-7 (badge), AC-8 (filtros)
**Dependências de:** Task 1 (enum FORMATADO)

### Subpassos
1. **STATUS_EQUIPAMENTO_MOV** e arrays equivalentes → inserir 'FORMATADO' (7 → 8 valores).
2. **LABEL_STATUS_EQUIPAMENTO_MOV** → `FORMATADO: 'Formatado'`
3. **CLASSE_BADGE_STATUS_EDIT_MOV** → `FORMATADO: 'bg-cyan-100 text-cyan-900 border-cyan-200'`
4. **LAYOUT_POR_STATUS_MOV** → `FORMATADO: { tituloBadge: '🖥️ Recém-formatado (pronto p/ atribuir)', descricao: 'Equipamento passou por formatação e reinstalação SO. Use Transferência, Empréstimo ou Saída para destinar.', severidade: 'info', camposEditaveis: ['descricao'] }`
5. **Filtros Equipamentos** tela select status inclui FORMATADO.
6. **Cartão detalhe** mostra badge Formatado.
7. **App.tsx What's New**: se versão ainda 1.2.7 adicionar item 1° lugar "Movimentações Manutenção: novo botão 🖥️ Formatação (muda nome do equipamento + status Formatado)" ou se já bumpou usar o item 9 extra. Não bump versão sem confirmação do usuário.

### Test Requirements
- **TR-4.1 (rule):** Filtro Status Equipamentos dropdown inclui "Formatado" → AC-8.
- **TR-4.2 (rule):** Equipamento status=FORMATADO renderiza badge com texto "Formatado" na listagem. AC-7.
- **TR-4.3 (rule):** Detalhe equipamento mostra layout severidade info + descrição. AC-7.

**Completion Evidence:** (preencher após completar)

---

## Task 5: Validação sintaxe + lint + build manual + regressão mov antigas

**Prioridade:** high
**Status:** pending
**Cobertura AC:** AC-9 (build 0), AC-10/11 rubrics validadas visualmente; garante que Manutenção Envio/Retorno/Ajuste ainda funcionam
**Dependências de:** Tasks 1, 2, 3, 4

### Subpassos
1. `cd backend && node --check src/services/MovimentacaoService.js src/utils/movimentacaoStatus.js src/controllers/movimentacoesController.js src/routes/movimentacoes.js` (todos exit 0).
2. `cd frontend && npx eslint src/pages/Movimentacoes.tsx src/pages/Equipamentos.tsx` exit 0.
3. `cd frontend && npx tsc --noEmit` exit 0.
4. `cd frontend && npm run build` exit 0.
5. Testar regressão: criar uma Manutenção Envio (precisa retornar sucesso) e Ajuste (1 campo) → nenhum crash.
6. Testar FORMATACAO rejeição com payload extra e depois payload válido (curl local dev).

### Test Requirements
- **TR-5.1 (rule):** node --check 4 arquivos → 0.
- **TR-5.2 (rule):** eslint + tsc + build → todos 0. AC-9.
- **TR-5.3 (rule):** Criar movimento MANUTENCAO_ENVIO em homolog = sucesso (sem regressão).
- **TR-5.4 (rubric 0-2):** UX grupo Manutenção Formatação → score 2 (AC-10).
- **TR-5.5 (rubric 0-2):** Histórico detalhe equipamento mostra Formatação + snapshots → score 2 (AC-11).

**Completion Evidence:** (preencher após completar)
