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
