import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadRuntimeDotenv() {
  const defaultEnvPath = path.resolve(__dirname, '../.env');
  const devEnvPath = path.resolve(__dirname, '../.env-dev');
  const isDevelopmentMode =
    process.env.NODE_ENV === 'development' ||
    process.env.npm_lifecycle_event === 'dev';

  dotenv.config({ path: defaultEnvPath });
  if (isDevelopmentMode) {
    dotenv.config({ path: devEnvPath, override: true });
  }
  return { isDevelopmentMode, defaultEnvPath, devEnvPath };
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

export function resolveAndInjectDatabaseUrl() {
  if (process.env.DB_USER) process.env.DB_USER = process.env.DB_USER;
  const scope = {
    DB_USER: process.env.DB_USER ?? '',
    DB_PASSWORD: process.env.DB_PASSWORD ?? '',
    DB_HOST: process.env.DB_HOST ?? '',
    DB_PORT: process.env.DB_PORT ?? '3306',
    DB_NAME: process.env.DB_NAME ?? '',
  };

  let url = process.env.DATABASE_URL ?? '';
  const tinhaPlaceholders = /\$\{[A-Z0-9_]+\}/.test(url);
  if (url) url = interpolate(url, scope);

  if (!url || /\$\{[A-Z0-9_]+\}/.test(url)) {
    if (scope.DB_HOST && scope.DB_NAME) {
      url = `mysql://${scope.DB_USER}:${scope.DB_PASSWORD}@${scope.DB_HOST}:${scope.DB_PORT}/${scope.DB_NAME}`;
    }
  }

  if (url) {
    process.env.DATABASE_URL = url;
  }

  return {
    urlRedacted: url ? String(url).replace(/\/\/(.*?):(.*?)@/, '//$1:***@') : '(vazia)',
    tinhaPlaceholders,
    host: scope.DB_HOST,
    name: scope.DB_NAME,
  };
}

export function bootstrapRuntimeEnv() {
  loadRuntimeDotenv();
  const info = resolveAndInjectDatabaseUrl();
  return info;
}
