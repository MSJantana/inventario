import pino from 'pino';

const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

export const logger = pino({
  level,
  // Sem transport pretty: logs JSON para fácil ingestão
  base: { app: 'inventario-backend' },
  timestamp: pino.stdTimeFunctions.isoTime,
});