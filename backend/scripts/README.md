# Scripts de Manutenção do Banco de Dados

## Script de Limpeza do Banco de Dados

Este script permite limpar o banco de dados do sistema de Inventário, oferecendo opções para limpar todas as tabelas ou tabelas específicas.

### Pré-requisitos

- Node.js instalado
- Projeto configurado com Prisma

### Como usar

1. Navegue até a pasta do backend:
   ```
   cd c:\Temp\Inventario\backend
   ```

2. Execute o script:
   ```
   node scripts/limparBancoDados.js
   ```

3. Siga as instruções no menu interativo:
   - Opção 1: Limpar todas as tabelas
   - Opção 2: Limpar uma tabela específica
   - Opção 0: Sair

### Observações importantes

- O script respeita a ordem de exclusão considerando as relações de chave estrangeira
- Sempre será solicitada uma confirmação antes de excluir dados
- As tabelas disponíveis para limpeza são:
  - Movimentacao
  - Equipamento
  - Usuario
  - Escola

### Exemplo de uso

```
=== SCRIPT DE LIMPEZA DO BANCO DE DADOS ===
1. Limpar todas as tabelas
2. Limpar uma tabela específica
0. Sair

Escolha uma opção: 1
ATENÇÃO: Todos os dados serão excluídos. Confirma? (S/N): S
Iniciando limpeza do banco de dados...
Excluindo registros de Movimentacao...
Excluindo registros de Equipamento...
Excluindo registros de Usuario...
Excluindo registros de Escola...
Banco de dados limpo com sucesso!
```