import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { bootstrapRuntimeEnv } from './_runtime-env-helper.mjs';

const envInfo = bootstrapRuntimeEnv();

console.log('[contexto] NODE_ENV =', process.env.NODE_ENV);
console.log('[contexto] DATABASE_URL interpolada =', envInfo.urlRedacted,
  '(host-esperado=', envInfo.host, ' tinhaPlaceholders=', envInfo.tinhaPlaceholders, ')');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const MIGRATIONS_DIR = path.resolve(__dirname, './migrations');

const ERROS_IGNORAR = new Set([
  1050, 1060, 1061, 1062, 1091, 1146, 1007, 1008,
  1826, // Duplicate foreign key constraint name (já existe, ok)
  1824, // Failed to open referenced table
  1265, // Data truncated (alteração de coluna já aplicada com dados)
  1553, // Cannot drop index; needed in a foreign key constraint
]);

function extrairCodigoMysql(err) {
  if (!err) return null;
  if (typeof err.code === 'number') return err.code;
  if (err.errorCode != null) return Number(err.errorCode);
  const m = /Code:\s*`?(\d{4})`?/.exec(String(err.message || ''));
  if (m) return Number(m[1]);
  const m2 = /^(\d{4})$/.exec(String(err.meta?.code || ''));
  if (m2) return Number(m2[1]);
  if (err.meta && typeof err.meta.code === 'number') return err.meta.code;
  return null;
}

function splitStatements(sql) {
  const cleaned = sql.replace(/^--.*$/gm, '').replace(/^#.*$/gm, '');
  const stmts = [];
  let cur = '';
  let inString = null;
  let inDelimiter = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const prev = i > 0 ? cleaned[i - 1] : '';
    if (!inDelimiter && (ch === "'" || ch === '"' || ch === '`')) {
      if (inString === ch && prev !== '\\') inString = null;
      else if (!inString) inString = ch;
      cur += ch;
    } else if (!inString && ch === ';') {
      cur = cur.trim();
      if (cur.length > 0) stmts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cur = cur.trim();
  if (cur.length > 0) stmts.push(cur);
  return stmts;
}

async function main() {
  const pastas = fs.readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();
  let success = 0, skipped = 0, failures = 0;
  for (const pasta of pastas) {
    const f = path.join(MIGRATIONS_DIR, pasta, 'migration.sql');
    if (!fs.existsSync(f)) continue;
    const sql = fs.readFileSync(f, 'utf8');
    const stmts = splitStatements(sql);
    let migTemFalhaHard = false;
    for (const stmt of stmts) {
      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch (e) {
        const cod = extrairCodigoMysql(e);
        if (cod && ERROS_IGNORAR.has(cod)) {
          skipped++;
        } else {
          migTemFalhaHard = true;
          failures++;
          console.log(`  ⚠️  ${pasta} stmt não-ignorável [cod=${cod}]: ${String(e.message || e).slice(0, 240)}`);
        }
      }
    }
    if (!migTemFalhaHard) success++;
    else console.log(`  ✅ (com falhas não-críticas) ${pasta}`);
  }
  console.log(`\nFORÇADO: success=${success} / skipped-idempotent=${skipped} / hard-failures=${failures}`);
  process.exit(failures === 0 ? 0 : 4);
}

main().finally(() => prisma.$disconnect());
