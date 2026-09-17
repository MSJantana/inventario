# 📘 Manual do Usuário — Novas Funcionalidades 7Inventory
**Versão:** Setembro 2026 | **Data:** 17/09/2026 | **Público:** Administradores, Gestores e Técnicos do sistema Inventário.

---

## 📋 Sumário

1. 🛡️ **Controle Global de Importação Chromebook CSV** (tela Configurações)
2. 🖨️ **Imprimir Relatórios sem Bloqueador de Popup** (singular e em lote)
3. 🏷️ **Badges Coloridas por Status** no Cartão de Identificação do Equipamento
   - 3.1 Badge **DOADO** em destaque no topo do cartão
4. 📥 **Importar Chromebooks em Massa via CSV do Google Admin Console**
5. ❓ **Perguntas Frequentes (FAQ)**
6. 📞 **Contato / Suporte**

---

---

## 1. 🛡️ Controle Global de Importação Chromebook CSV

### O que mudou?
Agora um **Administrador** do sistema pode **ativar ou desativar globalmente** a funcionalidade de importar arquivos CSV de Chromebooks (Google Admin Console ChromeOS), diretamente na tela de **Configurações**.

Quando a importação está **desativada**:
- Nenhum usuário (nem Gestor nem Técnico) consegue importar Chromebooks em massa, mesmo que conheça o caminho ou tente usar uma ferramenta externa.
- As abas / botões de importação somem automaticamente da tela de **Criar Equipamento**.
- O sistema mostra um **alerta amarelo** explicando o motivo.

### 🎯 Passo a passo para ativar ou desativar
*(Apenas usuários com perfil **ADMIN** conseguem alterar essa configuração global. Usuários Gestor/Técnico veem o status, mas não conseguem alterar globalmente.)*

1. Faça login com seu usuário **Administrador**.
2. No menu lateral esquerdo, clique em **Configurações** (ícone de engrenagem ⚙️).
3. Desça até a seção **Funcionalidades**.
4. Encontre o item **"Habilitar importação Chromebook CSV"** e clique no botão toggle:
   - 🔵 **Azul / Ligado** → Funcionalidade **ATIVA** (padrão, recomendado para operação diária).
   - ⚪ **Cinza / Desligado** → Funcionalidade **DESATIVADA** para todos os usuários da instância.
5. Clique no botão **[Salvar]** no final da página.
6. ✅ Pronto. A alteração entra em vigor **imediatamente** para todos os navegadores/usuários.

### 🧐 O que o usuário Gestor/Técnico vê quando está DESATIVADO?
Ao entrar em **Equipamentos → Criar Equipamento**, no lugar das abas:
```
 WinAudit (.html) | Chromebook CSV (.csv)
```
Aparece um **alerta amarelo** informativo:
> ⚠️ **A importação Chromebook CSV está desativada nas configurações do sistema.**
> Para importar, contate o Administrador para que ele ative a funcionalidade novamente.

O formulário normal de cadastro de equipamento continua funcionando 100% — só o modo de importação em massa que some.

---

## 2. 🖨️ Imprimir Relatórios Sem Bloqueador de Popup

### O que mudou?
Antes, o botão **"Imprimir"** abria uma **nova janela/popup**, e muitos navegadores (Chrome, Edge, Firefox) **bloqueavam** essa janela automaticamente. O resultado era:
- Tela em branco, ou
- Aviso genérico "Verifique bloqueadores de popup" sem saída.

**Agora, impressão funciona em 100% dos navegadores, sem popup.**

O relatório abre **diretamente na mesma janela** em camada sobreposta (overlay), e a janela de impressão do sistema operacional (Ctrl+P / Cmd+P) é disparada automaticamente.

### 2.1 Imprimir relatório INDIVIDUAL de 1 equipamento
1. Acesse **Equipamentos → (clique em um equipamento)** → botão **[Relatório]**.
2. No topo da tela de Relatório do Equipamento, clique no botão **[Imprimir]**.
3. A janela de impressão do seu navegador abre **automaticamente**, já formatada igual ao PDF oficial.
   - Escolha a impressora, ou
   - Selecione **"Salvar como PDF"** para gerar arquivo.
4. Feche a janela de impressão → o overlay some sozinho.

### 2.2 Imprimir relatório EM LOTE (lista de múltiplos equipamentos)
1. Acesse menu **Relatórios → Relatórios de Equipamentos**.
2. Aplique os filtros desejados (Status, Setor, Modelo etc) e clique em **[Buscar]**.
3. Clique no botão **[Imprimir]** acima da tabela.
4. A visualização abre em **formato A4 PAISAGEM** (horizontal) para caber todas as colunas:
   - 10 colunas principais de equipamento,
   - 6 colunas adicionais para Centro de Mídia (quando aplicável).
5. A janela de impressão abre automaticamente → imprima ou salve como PDF.

### ✅ Dica: Se a janela de impressão não abrir automaticamente
Pressione manualmente **Ctrl + P** (Windows / Linux) ou **Cmd + P** (macOS) enquanto a visualização do relatório estiver visível na tela. O layout overlay garante que **só o relatório vai ser impresso** (menus, cabeçalhos e rodapés do sistema ficam automaticamente invisíveis para a impressora).

---

## 3. 🏷️ Badges Coloridas por Status no Cartão de Identificação

### O que mudou?
O **cartão de identificação do equipamento** (aba "Identificação" quando abre um equipamento) agora mostra **badges coloridas** para indicar o **status atual do equipamento** de forma visual, rápida e intuitiva. Não é mais preciso abrir o dropdown para saber a situação.

### 🎨 Tabela de cores por status

| Emoji | Cor visual | Status do equipamento |
|---|---|---|
| ✅ | Verde claro | **DISPONÍVEL** |
| 💼 | Azul | **EM_USO** (Em uso) |
| 🔧 | Amarelo escuro / Âmbar | **EM_MANUTENÇÃO** |
| ⚠️ | Laranja | **RESERVADO** |
| 🚫 | Vermelho escuro | **EMPRESTADO** |
| 📤 | Roxo claro | **DOADO** (veja item 3.1 abaixo — aparece também em destaque no TOPO) |
| 🗑️ | Cinza escuro | **DESCARTADO** |
| 💀 | Preto | **BAIXA** |
| ⏰ | **Vermelho forte + NEGRITO** | **VENCIDO** (se o equipamento tem validade e passou do vencimento) |

### 3.1 🏷️ Badge **DOADO** em destaque no topo
Quando o status do equipamento é **DOADO**:
1. Aparece a badge roxa de DOADO na legenda de status (igual os outros status).
2. **E** aparece uma **badge extra em destaque no TOPO do cartão**, antes do número de patrimônio/tombamento, para chamar atenção imediatamente que o item foi doado e não pertence mais ao acervo.

---

## 4. 📥 Importar Chromebooks em Massa via CSV do Google Admin Console

### O que é?
Funcionalidade para importar **de uma só vez** todos os Chromebooks cadastrados no Google Admin Console (ChromeOS) usando um arquivo `.csv` exportado diretamente do painel do Google.

### Pré-requisito
Antes de começar, certifique-se de que um **Administrador ativou** a importação (ver o item **1. 🛡️ Controle Global de Importação Chromebook CSV** no começo deste manual).

### Passo a passo resumido
1. No **Google Admin Console** (admin.google.com) → **Dispositivos → Chrome → Dispositivos**.
2. Clique em **[Fazer download em massa]** e baixe o arquivo `.csv` com todos os dispositivos.
3. De volta ao **7Inventory**, entre em **Equipamentos → [Criar Equipamento]**.
4. Clique na aba **Chromebook CSV (.csv)** (ao lado da aba WinAudit).
5. Clique em **[Selecione um arquivo CSV]** e escolha o arquivo baixado do Google Admin.
6. Clique em **[Analisar CSV]** → o sistema exibe uma **pré-visualização (preview)** com:
   - ✅ Linhas válidas (serão importadas em verde),
   - ⚠️ Avisos (observações, campos em branco, etc),
   - ❌ Erros (linhas que não podem ser importadas).
7. Revise, corrija se necessário, e clique em **[Confirmar importação em lote]**.
8. ✅ Ao final, os equipamentos aparecem automaticamente na lista de **Equipamentos**, já preenchidos com:
   - ID do Chrome Device,
   - Serial Number,
   - Modelo,
   - Localização / unidade organizacional,
   - Data da última sincronização,
   - Usuário associado, e mais.

---

## 5. ❓ Perguntas Frequentes (FAQ)

### Q1. Sou Gestor/Técnico. Quero desativar a importação de CSV, mas o toggle está bloqueado. Por quê?
R.: A alteração **global** (para todos os usuários) é permitida **apenas para Administradores**. Isso evita que um usuário acidentalmente desligue uma funcionalidade crítica do setor. Contate o Administrador da sua unidade.

### Q2. Desativei a importação Chromebook CSV. O formulário normal de cadastro continua funcionando?
R.: **SIM!** Apenas o fluxo de importação em massa (.csv) some. O cadastro manual de equipamento, WinAudit .html, edição, exclusão e relatórios — todos continuam 100% ativos.

### Q3. A janela de impressão não abre. O que fazer?
R.: Pressione **Ctrl + P** (Windows/Linux) ou **Cmd + P** (macOS) enquanto a visualização do relatório estiver visível na tela. A partir de setembro/2026, o sistema não usa mais popups — então esse atalho sempre funciona. Se ainda sim falhar, limpe o cache do navegador e tente novamente.

### Q4. Como sei se um equipamento foi **doado** rapidamente?
R.: Ao abrir o equipamento, **antes mesmo de ler o número de patrimônio**, aparece uma badge **DOADO** em destaque no **topo** do cartão de identificação. A badge de status também fica na cor ROXA para DOADO.

### Q5. Como eu saibo se a garantia de um equipamento venceu?
R.: O cartão de identificação mostra a badge **VENCIDO** em **vermelho forte e negrito**. Ela aparece automaticamente quando:
   - O campo Data de Validade / Garantia foi preenchido, **E**
   - A data atual já passou dessa data.

### Q6. É possível reverter a desativação da importação CSV?
R.: **Sim, em 2 cliques.** Basta seguir o passo a passo do item 1, e voltar o toggle para **azul (ligado)**. A funcionalidade volta imediatamente, em todos os navegadores.

### Q7. Se eu fizer rollback de versão, perco a configuração do toggle?
R.: **NÃO.** A configuração fica salva em **2 lugares** (redundância):
   - No **banco de dados MySQL** (configuração global permanente, key `CHROMEBOOK_IMPORT_ENABLED`).
   - E, por segurança, no `localStorage` do navegador (fallback por usuário).

---

## 6. 📞 Contato / Suporte

Dúvidas, erros ou sugestões sobre estas funcionalidades:
1. **Prioridade 1:** Consulte primeiro o **Administrador do sistema 7Inventory** da sua unidade — ele consegue ajustar configurações globais, reativar importação, criar usuários, etc.
2. **Prioridade 2:** Se o Administrador não resolver, abra chamado interno na Central de Serviços / TI com as informações:
   - Nome do usuário e perfil (Admin / Gestor / Técnico),
   - Navegador e versão usados,
   - **Print de tela** com a mensagem de erro (se houver),
   - Passo a passo reproduzível do que tentou fazer.

---

**Fim do manual. Obrigado por usar o 7Inventory!**
