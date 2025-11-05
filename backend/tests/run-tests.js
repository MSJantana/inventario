import newman from 'newman';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// Obter o diretório atual usando ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Caminhos para os arquivos de coleção e ambiente
const collectionPath = path.join(__dirname, 'Inventario_API_Tests.postman_collection.json');
const environmentPath = path.join(__dirname, 'Inventario_API_Environment.postman_environment.json');

console.log('Iniciando testes da API do Sistema de Inventário...');

// Carregar arquivos JSON
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
const environment = JSON.parse(fs.readFileSync(environmentPath, 'utf8'));

// Executar a coleção de testes
newman.run({
    collection: collection,
    environment: environment,
    reporters: ['cli', 'htmlextra'],
    reporter: {
        htmlextra: {
            export: path.join(__dirname, 'report.html')
        }
    }
}, function (err) {
    if (err) {
        console.error('Erro ao executar os testes:', err);
        process.exit(1);
    }
    console.log('Testes concluídos com sucesso!');
});