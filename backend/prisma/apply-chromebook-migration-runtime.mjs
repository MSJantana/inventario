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

async function columnExists(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'`
  );
  const row = Array.isArray(rows) ? rows[0] : rows;
  return Number(row?.c || 0) > 0;
}

async function enumHasChromeBook() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Equipamento' AND COLUMN_NAME = 'tipo'`
  );
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) return false;
  const t = String(row.COLUMN_TYPE || '');
  return t.includes("'CHROMEBOOK'");
}

try {
  if (!(await enumHasChromeBook())) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `Equipamento` MODIFY COLUMN `tipo` ENUM('COMPUTADOR','NOTEBOOK','IMPRESSORA','PROJETOR','TABLET','MONITOR','ROTEADOR','SWITCH','OUTRO','CHROMEBOOK') NOT NULL"
    );
    console.log('[migration] OK: Equipamento.tipo ENUM modificado (CHROMEBOOK incluso)');
  } else {
    console.log('[migration] SKIP: Equipamento.tipo já contém CHROMEBOOK');
  }

  if (!(await columnExists('Equipamento', 'sourceExternalId'))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `Equipamento` ADD COLUMN `sourceExternalId` VARCHAR(191) NULL DEFAULT NULL"
    );
    console.log('[migration] OK: Equipamento.sourceExternalId adicionado');
  } else {
    console.log('[migration] SKIP: Equipamento.sourceExternalId já existe');
  }

  if (!(await columnExists('Equipamento', 'importMetadata'))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `Equipamento` ADD COLUMN `importMetadata` JSON NULL DEFAULT NULL"
    );
    console.log('[migration] OK: Equipamento.importMetadata adicionado');
  } else {
    console.log('[migration] SKIP: Equipamento.importMetadata já existe');
  }

  console.log('\n[result] Migration 20260902 (Chromebook) APLICADA COM SUCESSO no runtime host.');
} finally {
  await prisma.$disconnect();
}
