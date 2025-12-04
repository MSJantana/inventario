import { Prisma } from '@prisma/client';

const mapPrismaError = (err) => {
  const code = err.code;
  // Defaults
  let status = 500;
  let message = 'Ocorreu um erro interno no servidor.';

  const target = err.meta?.target;

  switch (code) {
    case 'P2002': {
      // Unique constraint failed
      status = 409;
      if (typeof target === 'string') {
        if (target.includes('Equipamento_serial_key')) {
          message = 'Já existe um equipamento com este serial.';
        } else if (target.includes('Usuario_email_key')) {
          message = 'Já existe um usuário com este email.';
        } else {
          message = 'Registro duplicado para campo(s) únicos.';
        }
      } else {
        message = 'Registro duplicado para campo(s) únicos.';
      }
      break;
    }
    case 'P2025': {
      // Record not found
      status = 404;
      message = 'Registro não encontrado.';
      break;
    }
    case 'P2003': {
      // Foreign key constraint failed
      status = 400;
      message = 'Operação inválida devido a referência (chave estrangeira).';
      break;
    }
    case 'P2000': {
      status = 400;
      message = 'Valor excede o tamanho permitido para o campo.';
      break;
    }
    default: {
      status = 500;
      message = 'Erro de banco de dados.';
    }
  }

  return { status, message };
};

const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const SHOW_STACK = process.env.LOG_STACK === 'true';

  let statusCode = err.statusCode || 500;
  let message = 'Ocorreu um erro interno no servidor.';

  // Prisma: KnownRequestError
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaError(err);
    statusCode = mapped.status;
    message = mapped.message;
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 500;
    message = 'Falha ao inicializar conexão com o banco de dados.';
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Dados inválidos para a operação solicitada.';
  } else if (typeof err.message === 'string' && err.message) {
    message = err.message;
  }

  const response = {
    status: 'error',
    statusCode,
    message,
    requestId: req.id,
  };

  // Em dev, retornar um identificador básico para facilitar debug sem expor stack
  if (isDev && err.code) {
    response.code = err.code;
  }

  // Log estruturado com pino quando disponível
  const shortMsg = err.message?.split('\n')[0] || message;
  const logPayload = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    status: statusCode,
    code: err.code,
    target: err?.meta?.target,
  };
  if (err.code === 'EBADCSRFTOKEN' && err.details) {
    logPayload.csrf = err.details;
  }
  if (req?.log) {
    if (SHOW_STACK) {
      req.log.error({ ...logPayload, err }, 'HTTP error');
    } else {
      req.log.error({ ...logPayload, message: shortMsg }, 'HTTP error');
    }
  } else {
    // Fallback: console
    let baseMsg = `[HTTP ERROR] ${req.method} ${req.originalUrl}`;
    if (err.code) baseMsg += ` code=${err.code}`;
    if (err.meta?.target) baseMsg += ` target=${err.meta.target}`;
    console.error(`${baseMsg} - ${shortMsg}`);
    if (SHOW_STACK && err.stack) {
      console.error(err.stack);
    }
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
