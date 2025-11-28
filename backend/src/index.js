import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Configuração do caminho para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração - deve ser a primeira coisa
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

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
const prisma = new PrismaClient({
  log: process.env.NODE_ENV !== 'production'
    ? ['query', 'warn']
    : ['warn']
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incomingId = req.headers['x-request-id'];
    const id = typeof incomingId === 'string' && incomingId.trim().length > 0
      ? incomingId
      : (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
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
    res.json({ status: 'ok', db: 'ok', dbHost });
  } catch (err) {
    const dbUrl = process.env.DATABASE_URL || '';
    let dbHost = null;
    try {
      const parsed = new URL(dbUrl);
      dbHost = parsed.hostname || null;
    } catch {}
    res.status(503).json({ status: 'degraded', db: 'error', dbHost });
  }
});

// Middleware de tratamento de erros
app.use(errorHandler);

// Rota raiz
app.get('/', (req, res) => {
  res.json({ message: 'API do Sistema de Inventário de Equipamentos' });
});

// Iniciar servidor
const PORT = Number(process.env.PORT ?? 3002);
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
