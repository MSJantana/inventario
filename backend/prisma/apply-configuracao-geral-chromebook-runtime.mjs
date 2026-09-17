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

const isDry = process.argv.includes('--dry');
const { host, user, password, port, database, urlRedacted } = resolveDbspec();
console.log('[contexto] NODE_ENV =', process.env.NODE_ENV);
console.log('[contexto] MySQL connect:', user + '@' + host + ':' + port + '/' + database, '  url=', urlRedacted, '; DRY=', isDry);

const CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS \`ConfiguracaoGeral\` (
    \`chave\` VARCHAR(120) NOT NULL COLLATE utf8mb4_unicode_ci,
    \`valor\` JSON NOT NULL,
    \`descricao\` VARCHAR(255) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`chave\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE InnoDB
`;
const SEED_SQL = `
  INSERT IGNORE INTO \`ConfiguracaoGeral\` (\`chave\`, \`valor\`, \`descricao\`) VALUES
    ('CHROMEBOOK_IMPORT_ENABLED', CAST('true' AS JSON),
     'Ativa/desativa globalmente a importacao de arquivos CSV Chromebook Google Admin Console ChromeOS.')
`;

let conn;
try {
  conn = await createConnection({ host, user, password, port, database, dateStrings: true });
  console.log('[conectado] mysql OK');

  if (isDry) {
    console.log('[migration] DRY: seria rodado CREATE TABLE IF NOT EXISTS ConfiguracaoGeral');
    console.log('[migration] DRY: seria rodado INSERT IGNORE seed CHROMEBOOK_IMPORT_ENABLED=true');
    console.log('[migration] DRY: seria rodado UPDATE seed (corrigir updatedAt invalido, se houver)');
  } else {
    await conn.execute(CREATE_SQL);
    console.log('[migration] OK: CREATE TABLE IF NOT EXISTS ConfiguracaoGeral (idempotent)');
    await conn.execute(SEED_SQL);
    console.log("[migration] OK: INSERT IGNORE seed CHROMEBOOK_IMPORT_ENABLED=true (idempotent)");
    const [modeRows] = await conn.execute("SHOW VARIABLES LIKE 'sql_mode'");
    await conn.execute("SET SESSION sql_mode = REPLACE(@@session.sql_mode, 'NO_ZERO_DATE', '')");
    await conn.execute("SET SESSION sql_mode = REPLACE(@@session.sql_mode, 'NO_ZERO_IN_DATE', '')");
    const [afterMode] = await conn.execute("SHOW VARIABLES LIKE 'sql_mode'");
    const strictOn = (afterMode && afterMode[0] && /STRICT_(ALL|TRADITIONAL)/i.test(String(afterMode[0].Value || '')));
    const checkDate = strictOn
      ? "YEAR(`updatedAt`) = 0"
      : "(`updatedAt` IS NULL OR DATE(`updatedAt`) = '0000-00-00')";
    console.log(`[migration] session sql_mode antes checagem updatedAt=${afterMode && afterMode[0] ? afterMode[0].Value : '?'}; strict=${strictOn}; predicate=${checkDate}`);
    const upd = await conn.execute(
      `UPDATE \`ConfiguracaoGeral\` SET \`updatedAt\` = CURRENT_TIMESTAMP(3) WHERE \`chave\` = 'CHROMEBOOK_IMPORT_ENABLED' AND ${checkDate}`
    );
    const updOk = upd && upd[0] && typeof upd[0].affectedRows === 'number' ? upd[0].affectedRows : 0;
    if (updOk > 0) {
      console.log(`[migration] OK: updatedAt corrigido (linhas afetadas=${updOk})`);
    } else {
      console.log('[migration] SKIP: updatedAt seed valido, nenhuma correcao necessaria');
    }
  }

  const [rows] = await conn.execute(
    "SELECT `chave`, `valor`, `descricao`, `createdAt`, `updatedAt` FROM `ConfiguracaoGeral` WHERE `chave` = 'CHROMEBOOK_IMPORT_ENABLED'"
  );
  console.log('\n[verificacao] ConfiguracaoGeral > CHROMEBOOK_IMPORT_ENABLED:');
  console.dir(rows, { depth: 4 });
  if (rows.length === 0) {
    console.warn('\n[WARN] Nenhuma linha retornada. DRY=true ou tabela ainda nao existe no host.');
  }
  console.log(`\n[result] Migration 20260917120000 (ConfiguracaoGeral + Chromebook toggle) ${isDry ? 'VALIDADA DRY-RUN' : 'APLICADA COM SUCESSO'} no host ${host}`);
} finally {
  try { if (conn) await conn.end(); } catch { /* ignore */ }
}
