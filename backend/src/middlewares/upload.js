import multer from 'multer';
import path from 'node:path';

const logEarly = (req, level, payload, msg) => {
  try {
    const logger = req.log || (typeof console !== 'undefined' ? console : null);
    if (!logger) return;
    if (typeof logger[level] === 'function') {
      logger[level](payload, msg);
    }
  } catch {
    // noop
  }
};

const ALLOWED_EXTENSIONS = new Set(['.html', '.htm']);
const ALLOWED_MIMES = new Set([
  'text/html',
  'text/htm',
  'application/xhtml+xml',
  'application/html',
  'text/plain',
  'application/octet-stream',
]);

const DEFAULT_MAX_MB = 5;

const formatarBytes = (n) => {
  if (Number.isFinite(n) && n >= 1024 * 1024) {
    const formatted = (n / (1024 * 1024)).toFixed(1).replace('.0$', '');
    return `${formatted} MB`;
  }
  if (Number.isFinite(n) && n >= 1024) {
    return `${Math.round(n / 1024)} KB`;
  }
  return `${Number(n) || 0} B`;
};

const parseMaxBytes = () => {
  const raw = process.env.WINAUDIT_MAX_MB;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed * 1024 * 1024;
  }
  return DEFAULT_MAX_MB * 1024 * 1024;
};

const storage = multer.memoryStorage();

export const MAX_WINAUDIT_BYTES = parseMaxBytes();

const fileFilter = (req, file, cb) => {
  const originalname = file.originalname || '';
  const ext = path.extname(originalname).toLowerCase();
  const extMatch = ALLOWED_EXTENSIONS.has(ext);
  const mime = typeof file.mimetype === 'string' ? file.mimetype.toLowerCase() : '';
  const mimeMatch = !mime || ALLOWED_MIMES.has(mime);

  logEarly(req, 'info', {
    etapa: 'multer:fileFilter',
    originalname,
    ext,
    extMatch,
    mime,
    mimeMatch,
    sizeHeader: typeof file.size === 'number' ? file.size : undefined,
  }, '[winaudit:upload] fileFilter');

  if (!extMatch) {
    const err = new Error('Extensão de arquivo inválida. Apenas arquivos .html e .htm são permitidos.');
    err.statusCode = 400;
    err.code = 'WINAUDIT_INVALID_EXTENSION';
    logEarly(req, 'warn', { ext, mime, originalname }, '[winaudit:upload] fileFilter bloqueado - extensao');
    cb(err);
    return;
  }

  if (!mimeMatch) {
    const err = new Error(
      'Tipo de conteúdo inválido. Selecione um arquivo HTML válido gerado pelo WinAudit.',
    );
    err.statusCode = 400;
    err.code = 'WINAUDIT_INVALID_MIME';
    logEarly(req, 'warn', { ext, mime, originalname }, '[winaudit:upload] fileFilter bloqueado - MIME');
    cb(err);
    return;
  }

  cb(null, true);
};

export const winauditUpload = multer({
  storage,
  limits: {
    fileSize: MAX_WINAUDIT_BYTES,
    files: 1,
    fields: 64,
    fieldSize: MAX_WINAUDIT_BYTES,
  },
  fileFilter,
});

export const winauditFileField = 'arquivo';

const resolveMulterErrorCode = (code) => {
  const map = {
    LIMIT_FILE_SIZE: {
      statusCode: 413,
      code: 'WINAUDIT_FILE_TOO_LARGE',
      message: `Arquivo excede o tamanho máximo permitido (${formatarBytes(MAX_WINAUDIT_BYTES)}).`,
    },
    LIMIT_FILE_COUNT: {
      statusCode: 400,
      code: 'WINAUDIT_TOO_MANY_FILES',
      message: 'Envie apenas um arquivo por vez.',
    },
    LIMIT_FIELD_COUNT: {
      statusCode: 400,
      code: 'WINAUDIT_TOO_MANY_FIELDS',
      message: 'Número excessivo de campos no formulário.',
    },
    LIMIT_FIELD_SIZE: {
      statusCode: 413,
      code: 'WINAUDIT_FIELD_TOO_LARGE',
      message: 'Campo do formulário excede o tamanho máximo permitido.',
    },
    LIMIT_UNEXPECTED_FILE: {
      statusCode: 400,
      code: 'WINAUDIT_UNEXPECTED_FIELD',
      message: 'Campo de arquivo inesperado no formulário.',
    },
    MISSING_FIELD_NAME: {
      statusCode: 400,
      code: 'WINAUDIT_MISSING_FIELD',
      message: 'Nome do campo de arquivo ausente.',
    },
  };
  return map[code] || null;
};

export const buildWinauditFileError = (error) => {
  if (!error) return null;
  const errorCode = typeof error.code === 'string' ? error.code : '';
  const mapped = resolveMulterErrorCode(errorCode);
  if (mapped) return mapped;

  const statusCode = Number.isFinite(error.statusCode) && error.statusCode >= 400
    ? error.statusCode
    : 400;
  const code = typeof error.code === 'string' && error.code.length > 0
    ? error.code
    : 'WINAUDIT_UPLOAD_ERROR';
  const message = typeof error.message === 'string' && error.message.length > 0
    ? error.message
    : 'Erro ao receber arquivo.';
  return { statusCode, code, message };
};

export const winauditFileLimitsInfo = {
  maxBytes: MAX_WINAUDIT_BYTES,
  maxBytesFormatado: formatarBytes(MAX_WINAUDIT_BYTES),
  extensoesPermitidas: ['.html', '.htm'],
  fieldName: winauditFileField,
};
