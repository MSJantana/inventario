import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'mysql2/promise';

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
const SIMPLE_VAR = /\$\{([A-Z0-9_]+)\}/g;
function interpolate(value, scope) {
  if (typeof value !== 'string' || value.length === 0) return value;
  let out = value;
  let guard = 0;
  while (/\$\{[A-Z0-9_]+\}/.test(out) && guard < 8) {
    guard++;
    out = out.replace(SIMPLE_VAR, (_, name) => {
      const v = scope[name];
      return typeof v === 'string' ? v : `\${${name}}`;
    });
  }
  return out;
}
function resolveDbspec() {
  const scope = {
    DB_USER: process.env.DB_USER ?? '',
    DB_PASSWORD: process.env.DB_PASSWORD ?? '',
    DB_HOST: process.env.DB_HOST ?? '',
    DB_PORT: process.env.DB_PORT ?? '3306',
    DB_NAME: process.env.DB_NAME ?? '',
  };
  let url = process.env.DATABASE_URL ?? '';
  if (url) url = interpolate(url, scope);
  let host = scope.DB_HOST || '';
  let user = scope.DB_USER || '';
  let password = scope.DB_PASSWORD || '';
  let port = Number(scope.DB_PORT) || 3306;
  let database = scope.DB_NAME || '';
  if (url) {
    try {
      const u = new URL(url);
      host = u.hostname || host;
      port = Number(u.port) || port;
      user = decodeURIComponent(u.username || user);
      password = decodeURIComponent(u.password || password);
      database = decodeURIComponent(u.pathname.replace(/^\//, '') || database);
    } catch { /* ignore */ }
  }
  const urlRedacted = url ? url.replace(/\/\/(.*?):(.*?)@/, '//$1:***@') : '';
  return { host, user, password, port, database, urlRedacted };
}

const STATUS_VALUES = [
  "'DISPONIVEL'",
  "'EM_USO'",
  "'EM_MANUTENCAO'",
  "'DESCARTADO'",
  "'RESERVADO'",
  "'EMPRESTADO'",
  "'FORMATADO'",
  "'DOADO'",
].join(',');

const TIPO_VALUES = [
  "'ENTRADA'",
  "'SAIDA'",
  "'TRANSFERENCIA'",
  "'MANUTENCAO'",
  "'DESCARTE'",
  "'MANUTENCAO_ENVIO'",
  "'MANUTENCAO_RETORNO'",
  "'FORMATACAO'",
  "'EMPRESTIMO'",
  "'DEVOLUCAO'",
  "'DOACAO'",
  "'AJUSTE'",
].join(',');

async function main() {
  const isDry = process.argv.includes('--dry');
  const { host, user, password, port, database, urlRedacted } = resolveDbspec();
  console.log(`[formatacao-enum] Conectando MySQL host=${host}:${port} db=${database} user=${user} (DATABASE_URL=${urlRedacted || '-'})`);
  if (!database) throw new Error('DB_NAME não resolvido. Verifique backend/.env ou DATABASE_URL.');
  const conn = await createConnection({ host, user, password, port, database, multipleStatements: true });
  try {
    const [rowsCols] = await conn.query(`
      SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME IN ('Equipamento','Movimentacao')
        AND COLUMN_NAME IN ('status','tipoMovimento')
    `, [database]);
    console.log('[formatacao-enum] Colunas atuais detectadas:');
    console.table(rowsCols);
    const temEnumAtual = (type, valuesList) => {
      const esperado = ('enum(' + valuesList + ')').toLowerCase();
      const atual = String(type || '').toLowerCase().replace(/\s+/g, '');
      return atual === esperado;
    };
    const stRow = rowsCols.find(r => String(r.TABLE_NAME) === 'Equipamento' && String(r.COLUMN_NAME) === 'status');
    const tmRow = rowsCols.find(r => String(r.TABLE_NAME) === 'Movimentacao' && String(r.COLUMN_NAME) === 'tipoMovimento');
    const stJaOk = stRow && temEnumAtual(stRow.COLUMN_TYPE, STATUS_VALUES);
    const tmJaOk = tmRow && temEnumAtual(tmRow.COLUMN_TYPE, TIPO_VALUES);
    console.log('[formatacao-enum] StatusEquipamento já possui FORMATADO?', Boolean(stJaOk));
    console.log('[formatacao-enum] TipoMovimento já possui FORMATACAO?', Boolean(tmJaOk));
    if (stJaOk && tmJaOk) {
      console.log('[formatacao-enum] NADA A FAZER (ambos enums já ajustados). Saindo 0 (idempotente).');
      return 0;
    }
    const stmts = [];
    if (!stJaOk) stmts.push(`ALTER TABLE \`Equipamento\` MODIFY COLUMN \`status\` ENUM(${STATUS_VALUES}) NOT NULL DEFAULT 'DISPONIVEL';`);
    if (!tmJaOk) stmts.push(`ALTER TABLE \`Movimentacao\` MODIFY COLUMN \`tipoMovimento\` ENUM(${TIPO_VALUES}) NOT NULL DEFAULT 'AJUSTE';`);
    console.log('[formatacao-enum] SQL a aplicar:');
    stmts.forEach(s => console.log('  > ' + s));
    if (isDry) {
      console.log('[formatacao-enum] --dry passado; NENHUM comando executado. Saindo 0.');
      return 0;
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const sql of stmts) {
      console.log('[formatacao-enum] Executando:', sql.slice(0, 120) + (sql.length > 120 ? '...' : ''));
      await conn.query(sql);
      console.log('[formatacao-enum] OK.');
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('[formatacao-enum] SUCESSO. Enums aplicados (idempotente nas próximas execuções).');
    return 0;
  } finally {
    await conn.end();
  }
}

main().then(code => process.exit(code || 0)).catch(err => {
  console.error('[formatacao-enum] FALHA:', err && err.message || err);
  process.exit(1);
});
