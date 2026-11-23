import YAML from 'yamljs';

export const swaggerDocument = YAML.parse(`
openapi: 3.0.3
info:
  title: API Sistema de Inventário de Equipamentos
  description: |
    API REST para controle de patrimônio de equipamentos distribuídos por escolas.
    Autenticação via JWT (Bearer) e proteção CSRF em métodos não-idempotentes.
  version: 1.1.11
servers:
  - url: http://localhost:3002
    description: Desenvolvimento local
  - url: https://inventario.asr.org.br/api
    description: Produção
tags:
  - name: Autenticação
    description: Login, recuperação de senha, logout e gerenciamento de usuários
  - name: Equipamentos
    description: CRUD e consulta de equipamentos, importação WinAudit e ChromeOS
  - name: Movimentações
    description: Registro e consulta de movimentações de equipamentos
  - name: Escolas
    description: Gerenciamento de escolas
  - name: Relatórios
    description: Geração de relatórios em PDF e CSV
  - name: Centro de Mídia
    description: Gerenciamento de itens de centro de mídia
  - name: Configurações
    description: Configurações globais do sistema
  - name: Utilitários
    description: CSRF token, healthcheck
paths:
  /api/health:
    get:
      tags: [Utilitários]
      summary: Verifica saúde da API e conexão com banco
      responses:
        '200':
          description: API está funcionando
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                  db:
                    type: string
  /api/csrf-token:
    get:
      tags: [Utilitários, Autenticação]
      summary: Emite token CSRF (requer autenticação)
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Token CSRF emitido
          content:
            application/json:
              schema:
                type: object
                properties:
                  csrfToken:
                    type: string
                  expiresIn:
                    type: integer
        '401':
          description: Não autenticado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
  /api/usuarios/login:
    post:
      tags: [Autenticação]
      summary: Login de usuário
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
                senha:
                  type: string
              required:
                - email
                - senha
      responses:
        '200':
          description: Login realizado com sucesso
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TokenResponse'
        '400':
          description: Credenciais inválidas
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
  /api/usuarios/recuperar-senha:
    post:
      tags: [Autenticação]
      summary: Solicitar recuperação de senha por email
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
              required:
                - email
      responses:
        '200':
          description: Instruções enviadas (resposta genérica para prevenir enumeração)
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
  /api/usuarios/redefinir-senha:
    post:
      tags: [Autenticação]
      summary: Redefinir senha com token de recuperação
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                token:
                  type: string
                novaSenha:
                  type: string
              required:
                - token
                - novaSenha
      responses:
        '200':
          description: Senha redefinida com sucesso
        '400':
          description: Token inválido ou expirado
  /api/usuarios:
    get:
      tags: [Autenticação]
      summary: Listar usuários (apenas ADMIN)
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Lista de usuários
        '403':
          description: Acesso negado
    post:
      tags: [Autenticação]
      summary: Criar usuário (apenas ADMIN)
      security:
        - bearerAuth: []
        - csrfHeader: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Usuario'
      responses:
        '201':
          description: Usuário criado
        '403':
          description: Acesso negado
  /api/usuarios/logout:
    post:
      tags: [Autenticação]
      summary: Logout (revoga o JWT)
      security:
        - bearerAuth: []
        - csrfHeader: []
      responses:
        '200':
          description: Logout realizado com sucesso
  /api/equipamentos:
    get:
      tags: [Equipamentos]
      summary: Listar equipamentos (com escopo por escola)
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Lista de equipamentos
    post:
      tags: [Equipamentos]
      summary: Criar equipamento
      security:
        - bearerAuth: []
        - csrfHeader: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Equipamento'
      responses:
        '201':
          description: Equipamento criado
  /api/equipamentos/{id}:
    get:
      tags: [Equipamentos]
      summary: Obter equipamento por ID
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Equipamento encontrado
    put:
      tags: [Equipamentos]
      summary: Atualizar equipamento
      security:
        - bearerAuth: []
        - csrfHeader: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Equipamento'
    delete:
      tags: [Equipamentos]
      summary: Excluir equipamento
      security:
        - bearerAuth: []
        - csrfHeader: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Equipamento excluído
  /api/escolas:
    get:
      tags: [Escolas]
      summary: Listar escolas
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Lista de escolas
    post:
      tags: [Escolas]
      summary: Criar escola
      security:
        - bearerAuth: []
        - csrfHeader: []
      responses:
        '201':
          description: Escola criada
  /api/escolas/{id}:
    get:
      tags: [Escolas]
      summary: Obter escola por ID
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Escola encontrada
    put:
      tags: [Escolas]
      summary: Atualizar escola
      security:
        - bearerAuth: []
        - csrfHeader: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Escola atualizada
    delete:
      tags: [Escolas]
      summary: Excluir escola
      security:
        - bearerAuth: []
        - csrfHeader: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Escola excluída
  /api/movimentacoes:
    get:
      tags: [Movimentações]
      summary: Listar movimentações
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Lista de movimentações
    post:
      tags: [Movimentações]
      summary: Criar movimentação
      security:
        - bearerAuth: []
        - csrfHeader: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                equipamentoId:
                  type: string
                tipoMovimento:
                  type: string
                origem:
                  type: string
                destino:
                  type: string
                escolaId:
                  type: string
                dataMovimento:
                  type: string
                  format: date-time
                observacoes:
                  type: string
              required:
                - equipamentoId
                - tipoMovimento
                - dataMovimento
      responses:
        '201':
          description: Movimentação criada
  /api/movimentacoes/{id}:
    get:
      tags: [Movimentações]
      summary: Obter movimentação por ID
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Movimentação encontrada
    put:
      tags: [Movimentações]
      summary: Atualizar movimentação
      security:
        - bearerAuth: []
        - csrfHeader: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Movimentação atualizada
    delete:
      tags: [Movimentações]
      summary: Excluir/estornar movimentação
      security:
        - bearerAuth: []
        - csrfHeader: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Movimentação estornada/excluída
  /api/movimentacoes/relatorio:
    get:
      tags: [Movimentações, Relatórios]
      summary: Relatório de movimentações
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Relatório gerado
  /api/relatorios/equipamentos:
    get:
      tags: [Relatórios]
      summary: Relatório de equipamentos em PDF
      security:
        - bearerAuth: []
      responses:
        '200':
          description: PDF gerado
          content:
            application/pdf:
              schema:
                type: string
                format: binary
  /api/centro-midia:
    get:
      tags: [Centro de Mídia]
      summary: Listar itens de centro de mídia
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Lista de itens de centro de mídia
    post:
      tags: [Centro de Mídia]
      summary: Criar item de centro de mídia
      security:
        - bearerAuth: []
        - csrfHeader: []
      responses:
        '201':
          description: Item criado
  /api/centro-midia/{id}:
    get:
      tags: [Centro de Mídia]
      summary: Obter item de centro de mídia por ID
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Item encontrado
    put:
      tags: [Centro de Mídia]
      summary: Atualizar item de centro de mídia
      security:
        - bearerAuth: []
        - csrfHeader: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Item atualizado
    delete:
      tags: [Centro de Mídia]
      summary: Excluir item de centro de mídia
      security:
        - bearerAuth: []
        - csrfHeader: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Item excluído
  /api/configuracoes/chromebook-import:
    get:
      tags: [Configurações]
      summary: Verificar se importação Chromebook está habilitada
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Status da configuração
    put:
      tags: [Configurações]
      summary: Ativar/desativar importação Chromebook
      security:
        - bearerAuth: []
        - csrfHeader: []
      responses:
        '200':
          description: Configuração atualizada
  /api/equipamentos/importar/winaudit/preview:
    post:
      tags: [Equipamentos]
      summary: Preview da importação WinAudit
      security:
        - bearerAuth: []
        - csrfHeader: []
      responses:
        '200':
          description: Preview gerado
  /api/equipamentos/importar/winaudit/confirmar:
    post:
      tags: [Equipamentos]
      summary: Confirmar importação WinAudit
      security:
        - bearerAuth: []
        - csrfHeader: []
      responses:
        '200':
          description: Importação confirmada
  /api/equipamentos/importar/chromeos/preview:
    post:
      tags: [Equipamentos]
      summary: Preview da importação ChromeOS CSV
      security:
        - bearerAuth: []
        - csrfHeader: []
      responses:
        '200':
          description: Preview gerado
  /api/equipamentos/importar/chromeos/confirmar:
    post:
      tags: [Equipamentos]
      summary: Confirmar importação ChromeOS CSV
      security:
        - bearerAuth: []
        - csrfHeader: []
      responses:
        '200':
          description: Importação confirmada
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Token JWT obtido no endpoint /login
    csrfHeader:
      type: apiKey
      in: header
      name: X-CSRF-TOKEN
      description: Token CSRF obrigatório em POST/PUT/PATCH/DELETE autenticados
  schemas:
    Usuario:
      type: object
      properties:
        id:
          type: string
          format: uuid
        nome:
          type: string
        email:
          type: string
          format: email
        role:
          type: string
          enum: [ADMIN, GESTOR, TECNICO, USUARIO]
        cargo:
          type: string
        escolaId:
          type: string
        escolasAcesso:
          type: array
          items:
            type: object
            properties:
              escolaId:
                type: string
      required:
        - nome
        - email
        - senha
    UsuarioResponse:
      type: object
      properties:
        id:
          type: string
        nome:
          type: string
        email:
          type: string
        role:
          type: string
        escolaId:
          type: string
        escolasAcesso:
          type: array
    Equipamento:
      type: object
      properties:
        id:
          type: string
          format: uuid
        nome:
          type: string
        patrimonio:
          type: string
        tipo:
          type: string
          enum: [COMPUTADOR, NOTEBOOK, IMPRESSORA, PROJETOR, TABLET, MONITOR, ROTEADOR, SWITCH, OUTRO, CHROMEBOOK]
        modelo:
          type: string
        serial:
          type: string
        status:
          type: string
          enum: [DISPONIVEL, EM_USO, EM_MANUTENCAO, DESCARTADO, RESERVADO, EMPRESTADO, FORMATADO, DOADO]
        localizacao:
          type: string
        escolaId:
          type: string
      required:
        - nome
        - tipo
        - modelo
        - serial
    Escola:
      type: object
      properties:
        id:
          type: string
        nome:
          type: string
        sigla:
          type: string
        endereco:
          type: string
        cidade:
          type: string
        estado:
          type: string
        cep:
          type: string
    Movimentacao:
      type: object
      properties:
        id:
          type: string
        equipamentoId:
          type: string
        tipoMovimento:
          type: string
        origem:
          type: string
        destino:
          type: string
        dataMovimento:
          type: string
          format: date-time
        observacoes:
          type: string
    ErrorResponse:
      type: object
      properties:
        error:
          type: string
        statusCode:
          type: integer
    TokenResponse:
      type: object
      properties:
        token:
          type: string
        usuario:
          type: object
          properties:
            id:
              type: string
            nome:
              type: string
            email:
              type: string
            role:
              type: string
`);
