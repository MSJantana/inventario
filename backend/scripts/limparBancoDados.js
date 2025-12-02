// Script para limpar o banco de dados (ESM)
import { PrismaClient } from '@prisma/client'
import readline from 'node:readline'
const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para limpar todas as tabelas
async function limparTodasTabelas() {
  try {
    console.log('Iniciando limpeza do banco de dados...');
    
    // Ordem de exclusão considerando as relações de chave estrangeira
    console.log('Excluindo registros de Movimentacao...');
    await prisma.movimentacao.deleteMany({});
    
    console.log('Excluindo registros de Equipamento...');
    await prisma.equipamento.deleteMany({});
    
    console.log('Excluindo registros de Usuario...');
    await prisma.usuario.deleteMany({});
    
    console.log('Excluindo registros de Escola...');
    await prisma.escola.deleteMany({});
    
    console.log('Banco de dados limpo com sucesso!');
  } catch (error) {
    console.error('Erro ao limpar o banco de dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Função para limpar uma tabela específica
async function limparTabela(tabela) {
  try {
    console.log(`Iniciando limpeza da tabela ${tabela}...`);
    
    if (!prisma[tabela.toLowerCase()]) {
      console.error(`Tabela ${tabela} não encontrada!`);
      return;
    }
    
    await prisma[tabela.toLowerCase()].deleteMany({});
    console.log(`Tabela ${tabela} limpa com sucesso!`);
  } catch (error) {
    console.error(`Erro ao limpar a tabela ${tabela}:`, error);
  } finally {
    await prisma.$disconnect();
  }
}

// Menu principal
function exibirMenu() {
  console.log('\n=== SCRIPT DE LIMPEZA DO BANCO DE DADOS ===');
  console.log('1. Limpar todas as tabelas');
  console.log('2. Limpar uma tabela específica');
  console.log('0. Sair');
  
  rl.question('\nEscolha uma opção: ', async (opcao) => {
    switch (opcao) {
      case '1':
        rl.question('ATENÇÃO: Todos os dados serão excluídos. Confirma? (S/N): ', async (resposta) => {
          if (resposta.toUpperCase() === 'S') {
            await limparTodasTabelas();
          } else {
            console.log('Operação cancelada.');
          }
          exibirMenu();
        });
        break;
      
      case '2':
        console.log('\nTabelas disponíveis:');
        console.log('1. Movimentacao');
        console.log('2. Equipamento');
        console.log('3. Usuario');
        console.log('4. Escola');
        
        rl.question('Escolha uma tabela para limpar: ', async (tabela) => {
          const tabelas = {
            '1': 'Movimentacao',
            '2': 'Equipamento',
            '3': 'Usuario',
            '4': 'Escola'
          };
          
          if (tabelas[tabela]) {
            rl.question(`ATENÇÃO: Todos os dados da tabela ${tabelas[tabela]} serão excluídos. Confirma? (S/N): `, async (resposta) => {
              if (resposta.toUpperCase() === 'S') {
                await limparTabela(tabelas[tabela]);
              } else {
                console.log('Operação cancelada.');
              }
              exibirMenu();
            });
          } else {
            console.log('Opção inválida!');
            exibirMenu();
          }
        });
        break;
      
      case '0':
        console.log('Saindo...');
        rl.close();
        process.exit(0);
        break;
      
      default:
        console.log('Opção inválida!');
        exibirMenu();
        break;
    }
  });
}

// Iniciar o script
console.log('Script de limpeza do banco de dados');
exibirMenu();
