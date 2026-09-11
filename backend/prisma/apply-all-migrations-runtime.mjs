import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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

const MIGRATIONS_DIR = path.resolve(__dirname, './migrations');

function lerMigrationsOrdenadas() {
  const pastas = fs.readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();
  const resultado = [];
  for (const pasta of pastas) {
    const caminhoSql = path.join(MIGRATIONS_DIR, pasta, 'migration.sql');
    if (!fs.existsSync(caminhoSql)) continue;
    const sql = fs.readFileSync(caminhoSql, 'utf8');
    resultado.push({ nome: pasta, sql, checksum: crypto.createHash('sha256').update(sql).digest('hex') });
  }
  return resultado;
}

async function tabelaExiste(nomeTabela) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${nomeTabela}'`
  );
  const row = Array.isArray(rows) ? rows[0] : rows;
  return Number(row?.c || 0) > 0;
}

async function migrationAplicada(nomeMigration) {
  if (!(await tabelaExiste('_prisma_migrations'))) return false;
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM \`_prisma_migrations\` WHERE migration_name = '${nomeMigration.replaceAll("'", "''")}'`
  );
  const row = Array.isArray(rows) ? rows[0] : rows;
  return Number(row?.c || 0) > 0;
}

async function marcarAplicada(nomeMigration, checksum, sql) {
  try {
    const colunasRows = await prisma.$queryRawUnsafe(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_prisma_migrations'`
    );
    const colunas = new Set(Array.isArray(colunasRows) ? colunasRows.map(r => r.COLUMN_NAME) : []);
    const campos = [];
    const values = [];
    const push = (col, val, quoted = true) => {
      if (!colunas.has(col)) return;
      campos.push(`\`${col}\``);
      values.push(quoted ? `'${String(val).replaceAll("'", "''")}'` : val);
    };
    push('id', crypto.randomUUID());
    push('migration_name', nomeMigration);
    push('checksum', checksum);
    if (colunas.has('migration_sql')) {
      const safeSql = sql.length > 100_000 ? sql.slice(0, 100_000) : sql;
      campos.push('`migration_sql`');
      values.push(`'${safeSql.replaceAll("'", "''")}'`);
    }
    push('started_at', 'NOW(3)', false);
    if (colunas.has('finished_at')) push('finished_at', 'NOW(3)', false);
    if (colunas.has('migration_time_ms')) push('migration_time_ms', 0);
    if (colunas.has('applied_steps_count')) push('applied_steps_count', 1);
    if (colunas.has('is_applied')) push('is_applied', 1);
    if (campos.length >= 2) {
      await prisma.$executeRawUnsafe(
        `INSERT IGNORE INTO \`_prisma_migrations\` (${campos.join(', ')}) VALUES (${values.join(', ')})`
      );
    }
  } catch { /* ignore */ }
}

function extrairCodigoMysqlErro(err) {
  if (!err) return null;
  if (typeof err.code === 'number') return err.code;
  if (err.errorCode != null) return Number(err.errorCode);
  const m = /Error code: (\d+)/.exec(String(err.message || ''));
  if (m) return Number(m[1]);
  return null;
}

const ERROS_IGNORAR = new Set([
  1050, // Table already exists
  1060, // Duplicate column name
  1061, // Duplicate key name
  1091, // Can't DROP ...; check that column/key exists
  1062, // Duplicate entry
  1146, // Table doesn't exist (referenciada em drop antigo)
]);

async function executarSqlSeguro(sql) {
  const stmts = sql
    .replace(/^--.*$/gm, '')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  for (const stmt of stmts) {
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (e) {
      const codigo = extrairCodigoMysqlErro(e);
      if (codigo && ERROS_IGNORAR.has(codigo)) {
        // ignore (idempotente)
      } else {
        throw e;
      }
    }
  }
}

async function main() {
  const lista = lerMigrationsOrdenadas();
  console.log(`[migrator] ${lista.length} migrations encontradas.`);
  let aplicadas = 0, jaEstavam = 0, falhas = 0;
  for (const mig of lista) {
    if (await migrationAplicada(mig.nome)) {
      jaEstavam++;
      console.log(`  ⏭️  ${mig.nome} — já aplicada`);
      continue;
    }
    try {
      await executarSqlSeguro(mig.sql);
      await marcarAplicada(mig.nome, mig.checksum, mig.sql);
      aplicadas++;
      console.log(`  ✅ ${mig.nome} — APLICADA`);
    } catch (e) {
      falhas++;
      console.log(`  ❌ ${mig.nome} — FALHOU: ${e.name}: ${e.message}`);
    }
  }
  console.log(`\nRESUMO: aplicadas=${aplicadas} / já estavam=${jaEstavam} / falhas=${falhas}`);
  process.exit(falhas === 0 ? 0 : 3);
}

async function run() {
  try {
    await main();
  } finally {
    await prisma.$disconnect();
  }
}

await run();
