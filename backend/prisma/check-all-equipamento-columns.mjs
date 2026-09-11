import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultEnvPath = path.resolve(__dirname, '../.env');
const devEnvPath = path.resolve(__dirname, '../.env-dev');
const isDevelopmentMode =
  process.env.NODE_ENV === 'development' ||
  process.env.npm_lifecycle_event === 'dev';

dotenv.config({ path: defaultEnvPath });
if (isDevelopmentMode) {
  dotenv.config({ path: devEnvPath, override: true });
}

const prisma = new PrismaClient();

const COLUNAS_ESPERADAS = [
  'id','nome','patrimonio','tipo','modelo','serial','status','localizacao',
  'fabricante','dataAquisicao','processador','memoria','macaddress',
  'observacoes','usuarioNome','setor','responsavel','escolaId',
  'sourceExternalId','importMetadata','createdAt','updatedAt'
];

const ENUM_VALORES_ESPERADOS = ['COMPUTADOR','NOTEBOOK','IMPRESSORA','PROJETOR','TABLET','MONITOR','ROTEADOR','SWITCH','OUTRO','CHROMEBOOK'];

try {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Equipamento'`
  );
  const existentes = new Set(Array.isArray(rows) ? rows.map(r => r.COLUMN_NAME) : []);
  console.log('=== Verificação colunas Equipamento (runtime host) ===\n');
  let falta = 0;
  for (const c of COLUNAS_ESPERADAS) {
    const ok = existentes.has(c);
    if (!ok) falta++;
    console.log(`${ok ? '✅' : '❌ FALTANDO'} ${c}`);
  }
  if (falta === 0) console.log('\n📝 Todas colunas presentes.');

  const enumRow = await prisma.$queryRawUnsafe(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Equipamento' AND COLUMN_NAME = 'tipo'`
  );
  const e = Array.isArray(enumRow) ? enumRow[0] : enumRow;
  const columnType = String(e?.COLUMN_TYPE || '');
  console.log('\n=== Verificação ENUM TipoEquipamento ===');
  console.log('COLUMN_TYPE atual:', columnType);
  for (const v of ENUM_VALORES_ESPERADOS) {
    const ok = columnType.includes(`'${v}'`);
    if (!ok) falta++;
    console.log(`${ok ? '✅' : '❌ FALTANDO no ENUM'} ${v}`);
  }

  console.log(`\nRESULTADO GERAL: ${falta === 0 ? 'TODOS OK' : falta + ' ITENS FALTANTES'}`);
  process.exit(falta === 0 ? 0 : 2);
} finally {
  await prisma.$disconnect();
}
