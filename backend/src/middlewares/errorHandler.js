import { Prisma } from '@prisma/client';

const mapPrismaError = (err) => {
  const code = err.code;
  let status;
  let message;

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

const resolveHttpError = (err) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaError(err);
    return { statusCode: mapped.status, message: mapped.message };
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return { statusCode: 500, message: 'Falha ao inicializar conexão com o banco de dados.' };
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return { statusCode: 400, message: 'Dados inválidos para a operação solicitada.' };
  }
  if (typeof err?.message === 'string' && err.message) {
    return { statusCode: err.statusCode || 500, message: err.message };
  }
  return { statusCode: err?.statusCode || 500, message: 'Ocorreu um erro interno no servidor.' };
};

const buildErrorResponse = (req, statusCode, message, err, isDev) => {
  const response = {
    status: 'error',
    statusCode,
    message,
    error: message,
    requestId: req.id,
  };
  if (isDev && err?.code) {
    response.code = err.code;
  }
  return response;
};

const logHttpError = (req, statusCode, message, err, showStack) => {
  const shortMsg = err?.message?.split('\n')[0] || message;
  const logPayload = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    status: statusCode,
    code: err?.code,
    target: err?.meta?.target,
  };
  if (err?.code === 'EBADCSRFTOKEN' && err.details) {
    logPayload.csrf = err.details;
  }
  if (req?.log) {
    if (showStack) {
      req.log.error({ ...logPayload, err }, 'HTTP error');
    } else {
      req.log.error({ ...logPayload, message: shortMsg }, 'HTTP error');
    }
    return;
  }
  let baseMsg = `[HTTP ERROR] ${req.method} ${req.originalUrl}`;
  if (err?.code) baseMsg += ` code=${err.code}`;
  if (err?.meta?.target) baseMsg += ` target=${err.meta.target}`;
  console.error(`${baseMsg} - ${shortMsg}`);
  if (showStack && err?.stack) {
    console.error(err.stack);
  }
};

const errorHandler = (err, req, res, _next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const showStack = process.env.LOG_STACK === 'true';

  const resolved = resolveHttpError(err);
  const response = buildErrorResponse(req, resolved.statusCode, resolved.message, err, isDev);
  logHttpError(req, resolved.statusCode, resolved.message, err, showStack);

  res.status(resolved.statusCode).json(response);
};

export default errorHandler;
