# Spec: Botão Formatação no menu Manutenção (Movimentações) — muda nome equipamento + novo status FORMATADO

**Data:** 2026-09-29
**Autores:** Marcio Santana + TRAE (especificação)
**Escopo:** Tela Movimentações (frontend React TS) + backend (Node Express + Prisma + MySQL).

## 1. Problema, Usuários, Objetivos e Não-Objetivos

### Problema
Quando um equipamento (notebook/computador) passa por uma formatação/reinstalação de sistema operacional hoje:
- Não há botão específico no submenu Manutenção da tela Movimentações. O técnico precisa usar "Ajuste" genérico ou outra operação.
- Não existe status "FORMATADO" para diferenciar visualmente equipamentos recém-formatados daqueles que estão apenas "Disponível" (estoque).
- Não há forma amigável de **alterar o `nome` do equipamento DENTRO do processo de movimentação** (padrão em formatações onde muda o hostname/nome do ativo). Hoje `nome` só é alterado no Ajuste manual (12 campos), o que traz risco de alterar outros campos sem querer.
- Não há trilha de auditoria separada de FORMATAÇÃO (não consta no histórico do equipamento como tipo próprio).

### Usuários afetados
- **TÉCNICO** — responsável direto pela formatação; principal usuário do botão.
- **GESTOR** — visualiza histórico e aprova/audita.
- **ADMIN** — fallback e configurações.

### Objetivos
- **O1.** Incluir um **novo botão "Formatação" no submenu/grupo Manutenção** da tela Movimentações (junto de Envio e Retorno).
- **O2.** Ao submeter a movimentação de **Formatação**, permitir alterar **apenas o campo `nome` do equipamento** (e só ele).
- **O3.** Criar **novo status `FORMATADO` em `StatusEquipamento`** do Prisma schema e aplicar automaticamente no equipamento após movimentação de Formatação.
- **O4.** Status `FORMATADO` deve aparecer em badges/filtros/tabelas de Equipamentos e no detalhe do equipamento.
- **O5.** Histórico/movimentações do equipamento mostram tipo FORMATAÇÃO com ícone e texto próprios.
- **O6.** Trilha auditável 100% via `criarMovimentacao` transaction padrão, com snapshots antes/depois.

### Não-Objetivos
- **N1.** NÃO criar nova entidade/tabela além de `Enum` do Prisma. Formatação é tipo de movimentação (campo `tipoMovimento=FORMATACAO`).
- **N2.** NÃO permitir formatação em equipamentos DOADO/DESCARTADO (status finais). Regra já aplicada via `STATUS_QUE_BLOQUEIAM_MOVIMENTO`.
- **N3.** NÃO permitir formatação enquanto o equipamento estiver EM_MANUTENCAO (ainda não voltou) ou EMPRESTADO.
- **N4.** NÃO adicionar fluxo 2-passos (envio/retorno). Formatação é operação instantânea na tela (como Ajuste/Transferência), 1 único botão.

## 2. Requisitos Funcionais

### RF-1 Grupo Manutenção (Movimentações.tsx) ganha novo item "Formatação"
- **1.1** `TIPOS_COMPLETOS` acrescenta `FORMATACAO` (12º item).
- **1.2** `TIPOS_FORMULARIO` acrescenta o item:
  - `value: 'FORMATACAO'`
  - `label: '🖥️ Formatação'`
  - `categoria: 'MANUTENCAO'`
  - `descricao: 'Reinstala SO, renomeia ativo e marca status Formatado'`
  - `endpoint: '/api/movimentacoes/formatacao'` (novo endpoint)
  - `statusEquipamentoPermitidos: ['DISPONIVEL','EM_USO','RESERVADO','FORMATADO']` — formatar 2x permitido (reenvio de imagem SO)
- **1.3** `ROTULOS_CATEGORIA['MANUTENCAO']` já continua como está; texto ajuda pode ser expandido opcionalmente, mas não obrigatório.
- **1.4** CLASSE_BADGE_TIPO: novo valor `FORMATACAO: 'bg-cyan-100 text-cyan-900'` ou similar.
- **1.5** `getTipoLabel('FORMATACAO')` retorna `'Formatação'`.
- **1.6** Texto auxiliar (hint) na seleção do tipo FORMATAÇÃO: `"Apenas equipamentos Disponível / Em uso / Reservado podem ser formatados"`

### RF-2 Formulário do tipo FORMATAÇÃO permite editar SOMENTE o nome do equipamento
- **2.1** Quando o tipo selecionado é FORMATAÇÃO, o modal Movimentar exibe:
  - Campos padrões (Data, Observações, Responsável) — já existem.
  - UM campo NOME (texto) **pré-preenchido** com o `equipamento.nome` atual (para o técnico só ajustar hostname pós formatação).
  - NÃO exibe os demais 12 campos do ajuste (patrimonio, modelo, serial, escolaId, etc.).
  - Texto ajuda abaixo do campo Nome: `"Apenas o nome/host pode ser alterado nesta movimentação. O equipamento passará para status FORMATADO automaticamente."`
- **2.2** Validação frontend (antes de submit):
  - `nome` não pode estar vazio após `trim()`.
  - `nome` comprimento máximo 255 (igual ao limite do banco).
  - Se o nome não mudou (`String(novo).trim() === String(atual).trim()`) → permitir (movimentação ainda é útil, marca status Formatado).
- **2.3** Payload para backend inclui `ajusteEquipamento: { nome: <valor>` (campo aninhado) **OU** campo `nomeNovo` flat (decisão de implementação em Tasks). Preferência: reutilizar `ajusteEquipamento` para manter consistência com AJUSTE, porém backend valida para aceitar SOMENTE `.nome` no caso FORMATAÇÃO.

### RF-3 Backend: Tipo FORMATAÇÃO + atualiza nome + status FORMATADO
- **3.1** Prisma `enum TipoMovimento` acrescenta `FORMATACAO`.
- **3.2** Prisma `enum StatusEquipamento` acrescenta `FORMATADO`.
- **3.3** `movimentacaoStatus.js` (regras transição):
  - `TIPO_PARA_STATUS_ALVO.FORMATACAO = 'FORMATADO'`
  - `REGRA_ESPECIAL.FORMATACAO: (status) => status não é EM_MANUTENCAO e não é EMPRESTADO e não é final`
  - `STATUS_EQUIPAMENTO` array inclui 'FORMATADO'
  - `TIPOS_MOVIMENTO` já usa `Object.keys(TIPO_PARA_STATUS_ALVO)` → automaticamente incluso.
- **3.4** `MovimentacaoService.js`:
  - `normalizarDadosMov` já copia `ajusteEquipamento` → sem mudanças.
  - `montarUpdatePorTipo` acrescenta `case 'FORMATACAO': return montarUpdateFormatacao(equipamentoAtual, dadosMov)`
  - Nova helper `montarUpdateFormatacao(equipamentoAtual, dadosMov)`:
    - Valida `dadosMov.ajusteEquipamento?.nome` existe (pode ser igual ao atual, mas não nulo undefined)
    - Valida que **nenhum outro campo de `ajusteEquipamento` foi enviado** (segurança: falha 400 se vir `modelo`, `status`, etc)
    - Se nome igual ao atual → retorna `{}`. Se diferente → retorna `{ nome: nomeNormalizado }`.
  - `CAMPOS_PERMITIDOS_AJUSTE` — **NÃO** precisa incluir aqui, pois FORMATAÇÃO usa sua própria helper.
  - Criar endpoint export `criarFormatacao` (análogo a `criarManutencaoEnvio`): normaliza + seta `tipoMovimento='FORMATACAO'` + chama `criarMovimentacao`.
  - Incluir `criarFormatacao` no objeto `MovimentacaoService` exportado.
- **3.5** `movimentacoes.js` (routes): acrescenta:
  - `router.post('/formatacao', auth, csrfProtect, permitRoles('ADMIN', 'GESTOR', 'TECNICO'), postFormatacao)`
  - Controller `postFormatacao` similar a `postManutencaoEnvio`: valida `equipamentoId` e `ajusteEquipamento.nome`, chama `criarFormatacao`, retorna JSON 201 com movimentação criada + equipamento atualizado.
- **3.6** `Equipamentos.tsx` (frontend tela equipamentos):
  - Array de status para selects/filtros inclui `FORMATADO`.
  - LABEL_STATUS_EQUIPAMENTO_MOV e similares incluem `FORMATADO: 'Formatado'`.
  - CLASSE_BADGE_STATUS inclui `FORMATADO: 'bg-cyan-100 text-cyan-900 border-cyan-200'` ou similar.
  - Detalhe Equipamento (cartão) mostra o badge quando status=FORMATADO.

### RF-4 Histórico/Relatórios de Movimentações mostram tipo Formatação
- **4.1** Tabela histórica movimentações (tela equipamento) coluna Tipo mostra "Formatação" com ícone próprio.
- **4.2** Relatório de Movimentações (impressão / listagem): tipo FORMATAÇÃO aparece na coluna Tipo.
- **4.3** `montarSnapshot` já captura `nome` e `status` — snapshots antes/depois já refletem a mudança automaticamente.

### RF-5 Filtros Movimentacoes / Equipamentos aceitam FORMATADO
- **5.1** Filtro "Status Equipamento" em telas de equipamentos inclui FORMATADO.
- **5.2** Filtro "Tipo Movimento" em Relatório Movimentações inclui FORMATAÇÃO.

## 3. Requisitos Não-Funcionais

### RNF-1 Manutenibilidade e Consistência
- Deve seguir MESMO padrão de Manutenção Envio/Retorno já existente: `normalizarDadosMov` → `criarMovimentacao` → `prisma.$transaction` → `montarUpdatePorTipo`. Nenhuma escrita bypass.
- Nenhum equipamento.status ou nome é escrito fora do fluxo `criarMovimentacao`.

### RNF-2 Segurança
- Permissões: `ADMIN/GESTOR/TECNICO` podem formatar (mesma permissão de manutencao envio). USUARIO não.
- Já validado em `movimentacoes.js` via `permitRoles`.
- `usuarioPodeAtuarNoEquipamento` (escolaId escopo) já aplicado no `criarMovimentacao`.

### RNF-3 Performance
- Nenhuma consulta nova. Impacto zero em buscas (enums existentes).

### RNF-4 Migração segura MySQL
- Alterações de enum no Prisma devem gerar migration SQL `ALTER TABLE ... MODIFY COLUMN` compatível e **idempotente** usando `runtime driver` MySQL (via script `.mjs` igual ao ConfiguracaoGeral) se o host `10.12.0.9` tiver Prisma dirty.
- Migration SQL deve usar `ALTER TABLE movimentacao MODIFY COLUMN tipoMovimento ENUM(...)` incluindo FORMATAÇÃO.
- Migration SQL deve usar `ALTER TABLE equipamento MODIFY COLUMN status ENUM(...)` incluindo FORMATADO.
- Seed inicial não precisa de FORMATADO (status só surge via movimentação).

### RNF-5 Internacionalização e UX
- Todos labels UI em Português Brasil; nenhum termo inglês sem tradução.
- Ícones dos botões consistentes (🖥️ para Formatação).

### RNF-6 Build/lint
- `npx tsc --noEmit` exit 0.
- `npx eslint frontend/src/pages/Movimentacoes.tsx frontend/src/pages/Equipamentos.tsx` exit 0.
- `cd backend && node --check src/services/MovimentacaoService.js src/utils/movimentacaoStatus.js src/routes/movimentacoes.js src/controllers/movimentacoesController.js` exit 0.
- `npm run build` frontend exit 0.

## 4. Restrições, Dependências, Premissas e Questões em Aberto

### Restrições
- **R1.** NÃO é permitido alterar tipoMovimento de movimentações já consolidadas (regra já existe).
- **R2.** NÃO adicionar `FORMATADO` a StatusImportacao enum.
- **R3.** `FORMATADO` NÃO é status final (diferente de DOADO/DESCARTADO). Equipamento FORMATADO pode ter movimento de SAIDA/TRANSFERENCIA/EMPRESTIMO normalmente.

### Dependências
- Prisma schema + MySQL no host 10.12.0.9 (produção) e 10.12.3.231 (homolog).
- Runtime migration driver já existe em `backend/prisma/apply-*.mjs` (ConfiguracaoGeral e Chromebook).

### Premissas
- **P1.** Formatação sempre deixa o equipamento FORMATADO. NÃO há dropdown para escolher outro status destino (diferente de ManutencaoRetorno/Devolucao).
- **P2.** O nome do equipamento é o campo "hostname/nome do ativo" (campo `Equipamento.nome` existente).
- **P3.** Origem e Destino da movimentação Formatação: usam mesmo fallback do Ajuste (equipamento.localizacao ou escola atual; valor padrão "Estoque Interno" se vazio).

### Questões em Aberto (Open Questions)
1. **Q1.** Ao formatar, a origem/destino deve ser fixada em `"Formatação Interna"` ou permanece com a localização atual do equipamento? **Premissa P3** responde: usar padrão Ajuste.
2. **Q2.** Badge FORMATADO deve ser de qual cor? Sugestão: **cyan/azul-claro (bg-cyan-100 text-cyan-900)**.
3. **Q3.** Após FORMATADO, pode voltar para DISPONIVEL automaticamente? **Resposta:** Não, FORMATADO permanece como status distinto (gestor pode lançar TRANSFERENCIA ou AJUSTE para DISPONIVEL depois se quiser). **Premissa R3.**

## 5. Critérios de Aceitação (Acceptance Criteria)

### AC-1 (rule) Botão no submenu Manutenção aparece para TÉCNICO/GESTOR/ADMIN
- **Fonte evidência:** Tela `/movimentacoes`, dropdown tipo movimentação. Ao expandir grupo 🔧 Manutenção, deve listar:
  1. 🔧 Envio para Manutenção
  2. 🔩 Retorno de Manutenção
  3. 🖥️ Formatação
- **Pass condition:** 3 itens no grupo MANUTENCAO visíveis.

### AC-2 (rule) Cabeçalhos Formulário Formatação exibe 1 campo nome
- **Fonte evidência:** Seleciona Formatação + 1 equipamento.
- **Pass condition:** Modal exibe campo "Nome do Equipamento" pré-preenchido e NÃO exibe 11 outros campos (modelo, serial, escola, etc). Campos data/observações/responsável normais.

### AC-3 (rule) Validação nome vazio bloqueia submit
- **Fonte evidência:** Frontend + submit com nome "    ".
- **Pass condition:** Submit bloqueado e erro "Nome é obrigatório para formatação."; nenhuma requisição enviada ao backend.

### AC-4 (rule) Backend rejeita payload FORMATAÇÃO com campos além de .nome
- **Fonte evidência:** POST `/api/movimentacoes/formatacao` com body `{ ajusteEquipamento: { nome: 'novo', status: 'DISPONIVEL' } }`.
- **Pass condition:** HTTP 400 com código `FORMATACAO_CAMPOS_EXTRA` e mensagem mencionando status proibido. Nenhuma linha criada.

### AC-5 (rule) Submeter Formatação bem-sucedida => cria movimentação + atualiza equipamento
- **Fonte evidência:** Equipamento 42 status atual EM_USO, nome "PC-LAB-01". Submeter com nome "PC-LAB-01-REIMG".
- **Pass condition:**
  - (a) Nova movimentacao tipoMovimento=FORMATACAO.
  - (b) Equipamento 42.status = FORMATADO.
  - (c) Equipamento 42.nome = "PC-LAB-01-REIMG".
  - (d) snapshots antes/depois no JSON movimentacao mostram nome e status.

### AC-6 (rule) Regras transição status: equipamento EM_MANUTENCAO ou EMPRESTADO NÃO PODE formatar
- **Fonte evidência:** Equipamento status EM_MANUTENCAO + form POST /formatacao.
- **Pass condition:** HTTP 400 TRANSICAO_INVALIDA, mensagem "Movimento FORMATAÇÃO não permitido. Status atual: EM_MANUTENCAO."; 0 linhas escritas.

### AC-7 (rule) Equipamentos FORMATADO exibe badge em listagem e cartão
- **Fonte evidência:** Listagem `/equipamentos` filtro status = Formatado.
- **Pass condition:** Badge Formatado visível (cor cyan sugerida). Controle detalhe equipamento mostra badge.

### AC-8 (rule) Filtros + selects de status/tipo incluem os 2 novos valores
- **Fonte evidência:** Frontend (selects) + endpoints.
- **Pass condition:** Filtros têm "Formatado" em status; Relatório Movimentações tem "Formatação" em Tipo Movimento.

### AC-9 (rule) Build + lint + node --check exit 0
- **Fonte evidência:** Linha comando frontend e backend.
- **Pass condition:** Todos 0. AC-9 necessário para deploy.

### AC-10 (rubric) UX/UI integração nova opção
- **Escala:** 0-2.
- **0:** Formatação separada do grupo Manutenção ou sem ícone/label em PT-BR.
- **1:** Dentro do grupo Manutenção porém sem ordem lógica ou sem pré-preenchimento do nome atual.
- **2:** (Pass threshold ≥2) Grupo Manutenção na ordem Envio/Retorno/Formatação, ícone consistente, nome pré-preenchido, mensagem ajuda clara.
- **Fonte evidência:** Inspecão visual do modal Movimentacoes + screencap.

### AC-11 (rubric) Clareza auditoria (histórico do equipamento)
- **Escala:** 0-2.
- **0:** Histórico não mostra Formatação ou sem snapshot antes/depois.
- **1:** Mostra Formatação mas sem evidência do antigo→novo nome.
- **2:** (Threshold ≥2) Histórico mostra tipo Formatação, label correto, snapshot nome e status antes/depois visível em JSON detalhe.
- **Fonte evidência:** Cartão equipamento detalhe, aba Histórico.
