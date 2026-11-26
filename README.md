# inventario_asrs

# Versão 1.3.6
    - Segurança: cabeçalhos de segurança HTTP (HSTS, X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy).
    - Segurança: banco de dados não exposto na rede — acessível apenas internamente via rede Docker.
    - Backup automático: rotina diária às 02:00 via container Debian no Portainer, com mysqldump remoto, compactação gzip e retenção de 3 meses.
    - Backup automático: notificação por email via Gmail em caso de sucesso ou falha.
    - Backup automático: scripts de backup e restauração disponíveis em backend/scripts/ e documentação em backend/docs/BACKUP.md.
    - Documentação: README e manual atualizados com informações de backup.

# Versão 1.3.5
    - Segurança: logout com invalidação de JWT (blocklist RevokedToken) — o token é revogado ao sair.
    - Segurança: rate limiting em login e recuperação de senha (máx. 10 e 5 tentativas por IP por minuto).
    - Segurança: recuperação de senha retorna mensagem genérica, evitando enumeração de e-mails.
    - Segurança: confirmação de exclusão em equipamentos, usuários, escolas, centro de mídia e movimentações — exige digitar "CONFIRMAR" para prosseguir.
    - Segurança: validação de contrato de API (OpenAPI/Swagger em /api-docs + testes de contrato).
    - Segurança: cabeçalhos de segurança HTTP (HSTS, X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy).
    - Segurança: banco de dados não exposto na rede — acessível apenas internamente via rede Docker.
    - Correção: build do Docker corrigido (JSX no ManualSistema.tsx).
    - Documentação: AGENTS.md criado com diretrizes e regras de segurança do repositório.
    - Versão do frontend atualizada para 1.3.5.
    - Versão do backend atualizada para 1.1.14.

# Versão 1.3.4
    - Segurança: arquivos .env removidos do versionamento Git (adicionados ao .gitignore).
    - Versão do frontend atualizada para 1.3.4.
    - Versão do backend atualizada para 1.1.13.

# Versão 1.3.3
    - Segurança: arquivos .env removidos do versionamento Git (adicionados ao .gitignore).
    - Segurança: logout com invalidação de JWT (blocklist RevokedToken) — o token é revogado ao sair.
    - Segurança: rate limiting em login e recuperação de senha (máx. 10 e 5 tentativas por IP por minuto).
    - Segurança: recuperação de senha retorna mensagem genérica, evitando enumeração de e-mails.
    - Correção: build do Docker corrigido (JSX no ManualSistema.tsx).
    - Documentação: AGENTS.md criado com diretrizes e regras de segurança do repositório.
    - Versão do frontend atualizada para 1.3.3.
    - Versão do backend atualizada para 1.1.11.

# Versão 1.3.2
    - Atualizar texto das novidades da versão 1.3.2 no popup da UI.
    - Corrigir exibição de versão na UI.

# Versão 1.3.0
- Equipamentos: filtro de busca também encontra equipamentos pelo número de série.

# Versão 1.2.9
- Nova Feature: Atualização inteligente de equipamentos existentes via WinAudit HTML, com comparação por campo, seleção de alterações e confirmação pelo toast do sistema.
- Proteção de dados: valores vazios do relatório não sobrescrevem cadastro; sem alterações não há atualização nem duplicação.
- Auditoria da atualização dos campos aplicados ao equipamento.

# Versão 1.2.8
    - Bug Fixed: Botão "Criar equipamento" não depende mais de "Habilitar botão Editar",

# Versão 1.2.7
    - Nova Feature (Movimentações > Manutenção): botão Formatação - formulário com 2 campos de nome lado-a-lado: "Nome (antes da formatação)" preenchido automaticamente e READONLY + "Nome (após formatação)" editável e obrigatório; a tela registra o que mudou e atualiza o status do equipamento para FORMATADO; validação de segurança no backend restringe alterar APENAS campo nome (bloqueia status/modelo/serial por endpoint com erro 400 FORMATACAO_CAMPOS_EXTRA); endpoint protegido roles ADMIN/GESTOR/TECNICO. Aplicado nos bancos host 10.12.0.9 (produção) e 10.12.3.231 (homolog / dev).
    - Relatórios: Impressão multi-páginas agora REPETE cabeçalho (logo, título, filtros) e rodapé (assinatura) em TODAS as páginas; diminuiu células da grade para caber mais itens por folha; corrige página em branco e conteúdo cortado após quebra.
    - Toggle Configurações (Admin): ativar/desativar importação Chromebook CSV Google Admin de forma global, agora com validação também no backend (retorna 403 se desativado).
    - Correções: SonarLint (S6551/S7744/S3358/S3776/S7762/S6582/S7758) em impressão, toast, useChromeosImport e WinAuditImportService; ajustes diversos de segurança e manutenibilidade.
    - Nova Feature: Botão Imprimir relatório(s) de equipamentos sem popup bloqueador, usando overlay + iframe (Relatório equipamento singular e listagem plural em A4 paisagem).
    - Nova Feature: Badges coloridos por status no cartão de identificação do equipamento + destaque vermelho para status VENCIDO.
    - Nova Feature: Badge DOADO no topo do cartão de identificação do equipamento.
    - Nova Feature: Importação de ChromeOS CSV para Equipamentos do Google Admin.
    - Bug Fixed: Melhorias Internas no Sistema.

# Versão 1.2.6
    - Bug Fixed: Corrigido Release Date.
    - Bug Fixed: Usuários sem ser Adm podem editar equipamentos.
    - Nova Feature: Mudança nas movimentações dos equipamentos.

# Versão 1.2.5
    - Bug Fixed: Corrigido Release Date.
    - Bug Fixed: Usuários sem ser Adm podem editar equipamentos.
    - Nova Feature: Mudança nas movimentações dos equipamentos.

# Versão 1.2.4
    - Bug Fixed: Melhorias internas no sistema.
    - Bug Fixed: Melhorias no tratamento de erros.
    - Nova Feature: Importação de arquivos pelo WinAudit.
    - Nova Feature: Relatórios de Auditoria de importação de dados.

# Versão 1.2.3
    - Bug Fixed: Melhorias internas no sistema.
    - Bug Fixed: Melhorias no tratamento de erros.
    - Bug Fixed: Corrigido o bug de múltiplos toasts "Sessão expirada" em axios.ts.
    - Nova Feature: Importação de arquivos pelo WinAudit.
    - Nova Feature: Relatórios de Auditoria de importação de dados.

# Versão 1.2.2
    - Bug Fixed: Melhorias internas no sistema.
    - Bug Fixed: Melhorias no tratamento de erros.

# Versão 1.2.1
    - Bug Fixed: Melhorias internas no sistema.
    - Bug Fixed: Ao redefinir a senha estava o usuário sendo direcionado para localhost:5174.

# Versão 1.2.0
    - Movimentações: Adicionado filtro para trazer o nome da escola.
    - Histórico de Movimentações: Adicionado filtro para trazer o nome da escola.
    - Fixados bugs e melhorias para gerar relatorios no Excel.
    - Criado campo para registrar número do patrimônio.
    - Fixados melhorias na interface do cadastro de equipamentos e movimentação.
    - Ajustado leitura do QR do equipamento.

# Versão 1.1.9
    - Fixados bugs e melhorias na interface do usuário.
    - Administradores podem acrescentar outras escolas para outros usuários.
    - No header agora exibi a quantidade de equipamentos em manutenção com um ícone de aviso.

# Versão 1.1.8
    - Na tela de Equipamentos, botão com informações do equipamento é exibido e um QR Code.
    - Na tela de Equipamentos, ao cancelar limpa os dados do formulário.
    - No header agora exibi a quantidade de equipamentos em manutenção com um ícone de aviso.

# Versão 1.1.7
    - Na tela de Equipamentos, data de aquisição é exibida.
    - Na tela de Equipamentos, data de validade do equipamento é exibida.
    - No menu configuração colocar tempo de validade do equipamento ao passar a validade exibir uma mensagem de aviso e fica vermelho.
    - No header agora exibi a quantidade de equipamentos vencidos com um ícone de aviso.

# Versão 1.1.6
    - Corrigido bug no relatório de pdf.
    - Ícones do Sistema Atualizado.
    - Correção de vários bugs e fixs.

# Versão 1.1.5
    - Corrigido Relatório Ordenado por Nome da Escola.
    - Adicionado um novo Rodapé.
    - Favicon do site.
    - Cadastro de equipamentos agora tem nome do usuário do PC.

# Versão 1.1.4
    - Movimentações de equipamentos podem ser exportado em formato XLSX.
    - Token ausente: retorna 403 com reason: missing.
    - Melhoria Interna no código "Sonarquebe".
    - Token correto: requisições de escrita são aceitas quando cabeçalho X-CSRF-Token é válido.

# Versão 1.1.3
    - Menu Centro Midia Liberado para todos os usuários.
    - Mostrar um toast de confirmação antes de excluir qualquer item e só executar a operação após confirmação.
    - Adicionado um novo menu "Departamentos" com dropdown contendo "Equipamentos" e "Centro de Midia".
    - Ao registrar uma movimentação de equipamentos poderá ser associada a um departamento no checkbox.
    - Relatórios poderão ser exportado em formato XLSX.

# Versão 1.1.2
    - Adicionado filtro por escola nos relatórios.
    - Correção Bug na Atualização de equipamento.
    - Correção no formato da Data no relatório de Movimentações.

# Versão 1.1.0
    - Novo menu e tela Centro de Mídia.
    - Cadastro do Centro de Mídia com filtros, paginação e CRUD.
    - Fallback para armazenamento local quando a API retornar 404 no Centro de Mídia.
    - Melhoria: foco automático no campo Nome ao criar usuário.
    - Proteções de rotas e visibilidade por perfil atualizadas.
    - Adicionado um novo menu "Departamentos" com dropdown contendo "Equipamentos" e "Centro de Mídia".
    - Adicionado filtro por departamento nos relatórios.
