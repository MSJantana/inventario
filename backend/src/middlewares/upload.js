import multer from 'multer';
import path from 'node:path';

const ALLOWED_EXTENSIONS = new Set(['.html', '.htm']);
const ALLOWED_MIMES = new Set([
  'text/html',
  'text/htm',
  'application/xhtml+xml',
]);

const DEFAULT_MAX_MB = 5;

const formatarBytes = (n) => {
  if (Number.isFinite(n) && n >= 1024 * 1024) {
    return `${(n / (1024 * 1024)).toFixed(1).replace('.0$', '')} MB`;
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
  const mimeMatch = file.mimetype && ALLOWED_MIMES.has(file.mimetype.toLowerCase());

  if (!extMatch) {
    const err = new Error('Extensão de arquivo inválida. Apenas arquivos .html e .htm são permitidos.');
    err.statusCode = 400;
    err.code = 'WINAUDIT_INVALID_EXTENSION';
    cb(err);
    return;
  }

  if (!mimeMatch) {
    const err = new Error('Tipo de conteúdo inválido. Selecione um arquivo HTML válido gerado pelo WinAudit.');
    err.statusCode = 400;
    err.code = 'WINAUDIT_INVALID_MIME';
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
    fields: 32,
  },
  fileFilter,
});

export const winauditFileField = 'arquivo';

export const buildWinauditFileError = (error) => {
  if (!error) return null;
  if (error.code === 'LIMIT_FILE_SIZE') {
    return {
      statusCode: 413,
      code: 'WINAUDIT_FILE_TOO_LARGE',
      message: `Arquivo excede o tamanho máximo permitido (${formatarBytes(MAX_WINAUDIT_BYTES)}).`,
    };
  }
  if (error.code === 'LIMIT_FILE_COUNT') {
    return {
      statusCode: 400,
      code: 'WINAUDIT_TOO_MANY_FILES',
      message: 'Envie apenas um arquivo por vez.',
    };
  }
  return {
    statusCode: error.statusCode || 400,
    code: error.code || 'WINAUDIT_UPLOAD_ERROR',
    message: error.message || 'Erro ao receber arquivo.',
  };
};

export const winauditFileLimitsInfo = {
  maxBytes: MAX_WINAUDIT_BYTES,
  maxBytesFormatado: formatarBytes(MAX_WINAUDIT_BYTES),
  extensoesPermitidas: ['.html', '.htm'],
  fieldName: winauditFileField,
};
