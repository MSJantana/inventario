# ðŸ“˜ Manual do UsuÃ¡rio â€” Novas Funcionalidades 7Inventory
**Versão:** 1.2.9 | **Data:** 07/10/2026 | **Público:** Administradores, Gestores e Técnicos do sistema Inventário.

---

## ðŸ“‹ SumÃ¡rio

1. ðŸ›¡ï¸ **Controle Global de ImportaÃ§Ã£o Chromebook CSV** (tela ConfiguraÃ§Ãµes)
2. ðŸ–¨ï¸ **Imprimir RelatÃ³rios sem Bloqueador de Popup** (singular e em lote)
3. ðŸ·ï¸ **Badges Coloridas por Status** no CartÃ£o de IdentificaÃ§Ã£o do Equipamento
   - 3.1 Badge **DOADO** em destaque no topo do cartÃ£o
4. ðŸ“¥ **Importar Chromebooks em Massa via CSV do Google Admin Console**
5. â“ **Perguntas Frequentes (FAQ)**
6. ðŸ“ž **Contato / Suporte**

---

---

## 1. ðŸ›¡ï¸ Controle Global de ImportaÃ§Ã£o Chromebook CSV

### O que mudou?
Agora um **Administrador** do sistema pode **ativar ou desativar globalmente** a funcionalidade de importar arquivos CSV de Chromebooks (Google Admin Console ChromeOS), diretamente na tela de **ConfiguraÃ§Ãµes**.

Quando a importaÃ§Ã£o estÃ¡ **desativada**:
- Nenhum usuÃ¡rio (nem Gestor nem TÃ©cnico) consegue importar Chromebooks em massa, mesmo que conheÃ§a o caminho ou tente usar uma ferramenta externa.
- As abas / botÃµes de importaÃ§Ã£o somem automaticamente da tela de **Criar Equipamento**.
- O sistema mostra um **alerta amarelo** explicando o motivo.

### ðŸŽ¯ Passo a passo para ativar ou desativar
*(Apenas usuÃ¡rios com perfil **ADMIN** conseguem alterar essa configuraÃ§Ã£o global. UsuÃ¡rios Gestor/TÃ©cnico veem o status, mas nÃ£o conseguem alterar globalmente.)*

1. FaÃ§a login com seu usuÃ¡rio **Administrador**.
2. No menu lateral esquerdo, clique em **ConfiguraÃ§Ãµes** (Ã­cone de engrenagem âš™ï¸).
3. DesÃ§a atÃ© a seÃ§Ã£o **Funcionalidades**.
4. Encontre o item **"Habilitar importaÃ§Ã£o Chromebook CSV"** e clique no botÃ£o toggle:
   - ðŸ”µ **Azul / Ligado** â†’ Funcionalidade **ATIVA** (padrÃ£o, recomendado para operaÃ§Ã£o diÃ¡ria).
   - âšª **Cinza / Desligado** â†’ Funcionalidade **DESATIVADA** para todos os usuÃ¡rios da instÃ¢ncia.
5. Clique no botÃ£o **[Salvar]** no final da pÃ¡gina.
6. âœ… Pronto. A alteraÃ§Ã£o entra em vigor **imediatamente** para todos os navegadores/usuÃ¡rios.

### ðŸ§ O que o usuÃ¡rio Gestor/TÃ©cnico vÃª quando estÃ¡ DESATIVADO?
Ao entrar em **Equipamentos â†’ Criar Equipamento**, no lugar das abas:
```
 WinAudit (.html) | Chromebook CSV (.csv)
```
Aparece um **alerta amarelo** informativo:
> âš ï¸ **A importaÃ§Ã£o Chromebook CSV estÃ¡ desativada nas configuraÃ§Ãµes do sistema.**
> Para importar, contate o Administrador para que ele ative a funcionalidade novamente.

O formulÃ¡rio normal de cadastro de equipamento continua funcionando 100% â€” sÃ³ o modo de importaÃ§Ã£o em massa que some.

---

## 2. ðŸ–¨ï¸ Imprimir RelatÃ³rios Sem Bloqueador de Popup

### O que mudou?
Antes, o botÃ£o **"Imprimir"** abria uma **nova janela/popup**, e muitos navegadores (Chrome, Edge, Firefox) **bloqueavam** essa janela automaticamente. O resultado era:
- Tela em branco, ou
- Aviso genÃ©rico "Verifique bloqueadores de popup" sem saÃ­da.

**Agora, impressÃ£o funciona em 100% dos navegadores, sem popup.**

O relatÃ³rio abre **diretamente na mesma janela** em camada sobreposta (overlay), e a janela de impressÃ£o do sistema operacional (Ctrl+P / Cmd+P) Ã© disparada automaticamente.

### 2.1 Imprimir relatÃ³rio INDIVIDUAL de 1 equipamento
1. Acesse **Equipamentos â†’ (clique em um equipamento)** â†’ botÃ£o **[RelatÃ³rio]**.
2. No topo da tela de RelatÃ³rio do Equipamento, clique no botÃ£o **[Imprimir]**.
3. A janela de impressÃ£o do seu navegador abre **automaticamente**, jÃ¡ formatada igual ao PDF oficial.
   - Escolha a impressora, ou
   - Selecione **"Salvar como PDF"** para gerar arquivo.
4. Feche a janela de impressÃ£o â†’ o overlay some sozinho.

### 2.2 Imprimir relatÃ³rio EM LOTE (lista de mÃºltiplos equipamentos)
1. Acesse menu **RelatÃ³rios â†’ RelatÃ³rios de Equipamentos**.
2. Aplique os filtros desejados (Status, Setor, Modelo etc) e clique em **[Buscar]**.
3. Clique no botÃ£o **[Imprimir]** acima da tabela.
4. A visualizaÃ§Ã£o abre em **formato A4 PAISAGEM** (horizontal) para caber todas as colunas:
   - 10 colunas principais de equipamento,
   - 6 colunas adicionais para Centro de MÃ­dia (quando aplicÃ¡vel).
5. A janela de impressÃ£o abre automaticamente â†’ imprima ou salve como PDF.

### âœ… Dica: Se a janela de impressÃ£o nÃ£o abrir automaticamente
Pressione manualmente **Ctrl + P** (Windows / Linux) ou **Cmd + P** (macOS) enquanto a visualizaÃ§Ã£o do relatÃ³rio estiver visÃ­vel na tela. O layout overlay garante que **sÃ³ o relatÃ³rio vai ser impresso** (menus, cabeÃ§alhos e rodapÃ©s do sistema ficam automaticamente invisÃ­veis para a impressora).

---

## 3. ðŸ·ï¸ Badges Coloridas por Status no CartÃ£o de IdentificaÃ§Ã£o

### O que mudou?
O **cartÃ£o de identificaÃ§Ã£o do equipamento** (aba "IdentificaÃ§Ã£o" quando abre um equipamento) agora mostra **badges coloridas** para indicar o **status atual do equipamento** de forma visual, rÃ¡pida e intuitiva. NÃ£o Ã© mais preciso abrir o dropdown para saber a situaÃ§Ã£o.

### ðŸŽ¨ Tabela de cores por status

| Emoji | Cor visual | Status do equipamento |
|---|---|---|
| âœ… | Verde claro | **DISPONÃVEL** |
| ðŸ’¼ | Azul | **EM_USO** (Em uso) |
| ðŸ”§ | Amarelo escuro / Ã‚mbar | **EM_MANUTENÃ‡ÃƒO** |
| âš ï¸ | Laranja | **RESERVADO** |
| ðŸš« | Vermelho escuro | **EMPRESTADO** |
| ðŸ“¤ | Roxo claro | **DOADO** (veja item 3.1 abaixo â€” aparece tambÃ©m em destaque no TOPO) |
| ðŸ—‘ï¸ | Cinza escuro | **DESCARTADO** |
| ðŸ’€ | Preto | **BAIXA** |
| â° | **Vermelho forte + NEGRITO** | **VENCIDO** (se o equipamento tem validade e passou do vencimento) |

### 3.1 ðŸ·ï¸ Badge **DOADO** em destaque no topo
Quando o status do equipamento Ã© **DOADO**:
1. Aparece a badge roxa de DOADO na legenda de status (igual os outros status).
2. **E** aparece uma **badge extra em destaque no TOPO do cartÃ£o**, antes do nÃºmero de patrimÃ´nio/tombamento, para chamar atenÃ§Ã£o imediatamente que o item foi doado e nÃ£o pertence mais ao acervo.

---

## 4. ðŸ“¥ Importar Chromebooks em Massa via CSV do Google Admin Console

### O que Ã©?
Funcionalidade para importar **de uma sÃ³ vez** todos os Chromebooks cadastrados no Google Admin Console (ChromeOS) usando um arquivo `.csv` exportado diretamente do painel do Google.

### PrÃ©-requisito
Antes de comeÃ§ar, certifique-se de que um **Administrador ativou** a importaÃ§Ã£o (ver o item **1. ðŸ›¡ï¸ Controle Global de ImportaÃ§Ã£o Chromebook CSV** no comeÃ§o deste manual).

### Passo a passo resumido
1. No **Google Admin Console** (admin.google.com) â†’ **Dispositivos â†’ Chrome â†’ Dispositivos**.
2. Clique em **[Fazer download em massa]** e baixe o arquivo `.csv` com todos os dispositivos.
3. De volta ao **7Inventory**, entre em **Equipamentos â†’ [Criar Equipamento]**.
4. Clique na aba **Chromebook CSV (.csv)** (ao lado da aba WinAudit).
5. Clique em **[Selecione um arquivo CSV]** e escolha o arquivo baixado do Google Admin.
6. Clique em **[Analisar CSV]** â†’ o sistema exibe uma **prÃ©-visualizaÃ§Ã£o (preview)** com:
   - âœ… Linhas vÃ¡lidas (serÃ£o importadas em verde),
   - âš ï¸ Avisos (observaÃ§Ãµes, campos em branco, etc),
   - âŒ Erros (linhas que nÃ£o podem ser importadas).
7. Revise, corrija se necessÃ¡rio, e clique em **[Confirmar importaÃ§Ã£o em lote]**.
8. âœ… Ao final, os equipamentos aparecem automaticamente na lista de **Equipamentos**, jÃ¡ preenchidos com:
   - ID do Chrome Device,
   - Serial Number,
   - Modelo,
   - LocalizaÃ§Ã£o / unidade organizacional,
   - Data da Ãºltima sincronizaÃ§Ã£o,
   - UsuÃ¡rio associado, e mais.

---

## 5. â“ Perguntas Frequentes (FAQ)

### Q1. Sou Gestor/TÃ©cnico. Quero desativar a importaÃ§Ã£o de CSV, mas o toggle estÃ¡ bloqueado. Por quÃª?
R.: A alteraÃ§Ã£o **global** (para todos os usuÃ¡rios) Ã© permitida **apenas para Administradores**. Isso evita que um usuÃ¡rio acidentalmente desligue uma funcionalidade crÃ­tica do setor. Contate o Administrador da sua unidade.

### Q2. Desativei a importaÃ§Ã£o Chromebook CSV. O formulÃ¡rio normal de cadastro continua funcionando?
R.: **SIM!** Apenas o fluxo de importaÃ§Ã£o em massa (.csv) some. O cadastro manual de equipamento, WinAudit .html, ediÃ§Ã£o, exclusÃ£o e relatÃ³rios â€” todos continuam 100% ativos.

### Q3. A janela de impressÃ£o nÃ£o abre. O que fazer?
R.: Pressione **Ctrl + P** (Windows/Linux) ou **Cmd + P** (macOS) enquanto a visualizaÃ§Ã£o do relatÃ³rio estiver visÃ­vel na tela. A partir de setembro/2026, o sistema nÃ£o usa mais popups â€” entÃ£o esse atalho sempre funciona. Se ainda sim falhar, limpe o cache do navegador e tente novamente.

### Q4. Como sei se um equipamento foi **doado** rapidamente?
R.: Ao abrir o equipamento, **antes mesmo de ler o nÃºmero de patrimÃ´nio**, aparece uma badge **DOADO** em destaque no **topo** do cartÃ£o de identificaÃ§Ã£o. A badge de status tambÃ©m fica na cor ROXA para DOADO.

### Q5. Como eu saibo se a garantia de um equipamento venceu?
R.: O cartÃ£o de identificaÃ§Ã£o mostra a badge **VENCIDO** em **vermelho forte e negrito**. Ela aparece automaticamente quando:
   - O campo Data de Validade / Garantia foi preenchido, **E**
   - A data atual jÃ¡ passou dessa data.

### Q6. Ã‰ possÃ­vel reverter a desativaÃ§Ã£o da importaÃ§Ã£o CSV?
R.: **Sim, em 2 cliques.** Basta seguir o passo a passo do item 1, e voltar o toggle para **azul (ligado)**. A funcionalidade volta imediatamente, em todos os navegadores.

### Q7. Se eu fizer rollback de versÃ£o, perco a configuraÃ§Ã£o do toggle?
R.: **NÃƒO.** A configuraÃ§Ã£o fica salva em **2 lugares** (redundÃ¢ncia):
   - No **banco de dados MySQL** (configuraÃ§Ã£o global permanente, key `CHROMEBOOK_IMPORT_ENABLED`).
   - E, por seguranÃ§a, no `localStorage` do navegador (fallback por usuÃ¡rio).

---

## 6. ðŸ“ž Contato / Suporte

DÃºvidas, erros ou sugestÃµes sobre estas funcionalidades:
1. **Prioridade 1:** Consulte primeiro o **Administrador do sistema 7Inventory** da sua unidade â€” ele consegue ajustar configuraÃ§Ãµes globais, reativar importaÃ§Ã£o, criar usuÃ¡rios, etc.
2. **Prioridade 2:** Se o Administrador nÃ£o resolver, abra chamado interno na Central de ServiÃ§os / TI com as informaÃ§Ãµes:
   - Nome do usuÃ¡rio e perfil (Admin / Gestor / TÃ©cnico),
   - Navegador e versÃ£o usados,
   - **Print de tela** com a mensagem de erro (se houver),
   - Passo a passo reproduzÃ­vel do que tentou fazer.

---

**Fim do manual. Obrigado por usar o 7Inventory!**

## 7. Atualização inteligente de equipamentos via WinAudit (v1.2.9)

Ao importar um relatório WinAudit em HTML (.html ou .htm), o sistema verifica se o equipamento já está cadastrado. Quando encontra um registro correspondente, apresenta os valores atuais e os valores do relatório campo a campo.

- Selecione os campos alterados ou novos que deseja aplicar.
- Confirme a operação no toast de confirmação do sistema.
- Campos sem valor no relatório não apagam dados cadastrados.
- Sem diferenças, nenhum dado é alterado e não é criado um cadastro duplicado.
- Patrimônio, escola, status, localização administrativa, observações e demais campos internos permanecem inalterados.
- A operação atualiza o equipamento existente e registra os campos modificados no log de importação.
