import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Configuração do caminho para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração - deve ser a primeira coisa
const defaultEnvPath = path.resolve(__dirname, '../.env');
const devEnvPath = path.resolve(__dirname, '../.env-dev');
const isDevelopmentMode =
  process.env.NODE_ENV === 'development' ||
  process.env.npm_lifecycle_event === 'dev';

dotenv.config({ path: defaultEnvPath });

if (isDevelopmentMode) {
  dotenv.config({ path: devEnvPath, override: true });
}

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger.js';
import crypto from 'node:crypto';
import auth from './middlewares/auth.js';
import { issueCsrfToken } from './middlewares/csrf.js';

// Importando rotas
import equipamentosRoutes from './routes/equipamentos.js';
import usuariosRoutes from './routes/usuarios.js';
import movimentacoesRoutes from './routes/movimentacoes.js';
import escolasRoutes from './routes/escolas.js';
import relatoriosRoutes from './routes/relatorios.js';
import centroMidiaRoutes from './routes/centroMidia.js';
import errorHandler from './middlewares/errorHandler.js';
const app = express();
app.disable('x-powered-by');
const prisma = new PrismaClient({
  log: process.env.NODE_ENV !== 'production'
    ? ['query', 'warn']
    : ['warn']
});

const isDevRuntime = () =>
  process.env.NODE_ENV !== 'production' ||
  process.env.npm_lifecycle_event === 'dev';

const isLocalOrPrivateOrigin = (origin) => {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '[::1]' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host.endsWith('.local')
    );
  } catch {
    return false;
  }
};

const getAllowedCorsOrigins = () => {
  const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const extraOrigins = (process.env.CORS_EXTRA_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const fromEnv = Array.from(new Set([...configuredOrigins, ...extraOrigins]));
  if (fromEnv.length > 0 && !isDevRuntime()) {
    return fromEnv;
  }

  const devDefaults = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
  ];

  return Array.from(new Set([...fromEnv, ...devDefaults]));
};

const allowedCorsOrigins = new Set(getAllowedCorsOrigins());
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedCorsOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    if (isLocalOrPrivateOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS origin not allowed: ' + origin));
  },
};

const generateRequestId = () => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return (
    hex.slice(0, 8) + '-' +
    hex.slice(8, 12) + '-' +
    hex.slice(12, 16) + '-' +
    hex.slice(16, 20) + '-' +
    hex.slice(20, 32)
  );
};

const REQUEST_LIMIT_BYTES = 50 * 1024 * 1024;

// Middlewares
app.use(cors(corsOptions));
app.use(express.json({ limit: REQUEST_LIMIT_BYTES }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_LIMIT_BYTES }));
app.use(pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incomingId = req.headers['x-request-id'];
    const id = typeof incomingId === 'string' && incomingId.trim().length > 0
      ? incomingId
      : generateRequestId();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel: (res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
}));

// Rotas
app.use('/api/equipamentos', equipamentosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/movimentacoes', movimentacoesRoutes);
app.use('/api/escolas', escolasRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/centro-midia', centroMidiaRoutes);

// Endpoint para emissão de CSRF token (requer autenticação)
app.get('/api/csrf-token', auth, issueCsrfToken);

// Healthcheck (inclui verificação de banco com Prisma)
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const dbUrl = process.env.DATABASE_URL || '';
    let dbHost = null;
    try {
      const parsed = new URL(dbUrl);
      dbHost = parsed.hostname || null;
    } catch {}

    const hostsEnv = process.env.DB_DEV_HOSTS || '';
    const fromEnv = hostsEnv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const safeDefaults = [
      'mysql',
      'db',
      'mariadb',
      'postgres',
      'localhost',
      '127.0.0.1',
      '10.12.3.231',
    ];
    const devHosts = Array.from(new Set([...fromEnv, ...safeDefaults]));
    const dbIsDev = dbHost ? devHosts.includes(dbHost) : false;
    res.json({ status: 'ok', db: 'ok', dbHost, dbIsDev });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'error', error: err.message });
  }
});

// Middleware de tratamento de erros
app.use(errorHandler);

// Rota raiz
app.get('/', (req, res) => {
  res.json({ message: 'API do Sistema de Inventário de Equipamentos' });
});

// Iniciar servidor
const parsedPort = Number.parseInt(process.env.PORT || '3002', 10);
const PORT = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3002;
app.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT, host: '0.0.0.0' }, '[server] listening');
});


// Tratamento de erros do Prisma
const SLOW_MS = Number.parseInt(process.env.LOG_QUERY_SLOW_MS || '0', 10);

if (process.env.NODE_ENV !== 'production') {
  prisma.$on('query', (e) => {
    logger.info({ duration: e.duration, query: e.query, params: e.params || undefined }, 'Prisma query');
  });
} else if (SLOW_MS > 0) {
  // Em produção, logar apenas consultas lentas se habilitado via LOG_QUERY_SLOW_MS
  prisma.$on('query', (e) => {
    if (e.duration >= SLOW_MS) {
      logger.warn({ duration: e.duration, query: e.query }, 'Prisma slow query');
    }
  });
}

// Exportar o cliente Prisma
export { prisma };
