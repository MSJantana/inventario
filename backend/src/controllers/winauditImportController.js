import PrismaClientModule from '@prisma/client';
import path from 'node:path';
import { winauditUpload, winauditFileField, buildWinauditFileError } from '../middlewares/upload.js';
import WinAuditImportService from '../services/WinAuditImportService.js';

const { PrismaClient } = PrismaClientModule;

const prisma = new PrismaClient();

const WINAUDIT_VERSION = process.env.WINAUDIT_IMPORTER_VERSION || '1.3.0';

const extrairIpOrigem = (req) => {
  const headerCf = req.headers?.['cf-connecting-ip'];
  if (typeof headerCf === 'string' && headerCf.trim().length > 0) return headerCf.trim();
  const headerXForwardedFor = req.headers?.['x-forwarded-for'];
  if (typeof headerXForwardedFor === 'string' && headerXForwardedFor.trim().length > 0) {
    const primeiro = headerXForwardedFor.split(',')[0];
    if (primeiro) return primeiro.trim();
  }
  const headerXRealIp = req.headers?.['x-real-ip'];
  if (typeof headerXRealIp === 'string' && headerXRealIp.trim().length > 0) return headerXRealIp.trim();
  const socketRemote = req.socket?.remoteAddress || req.ip || null;
  return typeof socketRemote === 'string' ? socketRemote : null;
};

const extrairTipoArquivo = (file) => {
  if (!file) return null;
  const mimetype = typeof file.mimetype === 'string' ? file.mimetype.toLowerCase() : '';
  if (mimetype.includes('html') || mimetype.includes('htm')) return 'HTML';
  const ext = path.extname(file.originalname || '').replace('.', '').toUpperCase();
  if (ext === 'HTML' || ext === 'HTM') return 'HTML';
  return ext || null;
};

const extrairFiltrosDeQuery = (query) => {
  const filtros = {};
  if (!query) return filtros;
  if (query.status) filtros.status = String(query.status);
  if (query.arquivoOriginalContem) filtros.arquivoOriginalContem = String(query.arquivoOriginalContem);
  if (query.usuarioId) filtros.usuarioId = String(query.usuarioId);
  if (query.equipamentoId) filtros.equipamentoId = String(query.equipamentoId);
  if (query.dataInicio) filtros.dataInicio = String(query.dataInicio);
  if (query.dataFim) filtros.dataFim = String(query.dataFim);
  return filtros;
};

export const importarWinAuditPreview = (req, res, next) => {
  try {
    const logTrace = (etapa, extra) => {
      const payload = {
        etapa,
        contentType: req.headers?.['content-type'] || null,
        contentLength: Number(req.headers?.['content-length']) || 0,
        hasFile: !!req.file,
        bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : null,
        usuarioId: req?.usuario?.id || null,
        ...(extra || {}),
      };
      try {
        if (req.log) {
          req.log.info(payload, '[winaudit:preview]');
        } else {
          console.log('[winaudit:preview]', JSON.stringify(payload, (k, v) => typeof v === 'bigint' ? Number(v) : v));
        }
      } catch {
        console.log('[winaudit:preview]', etapa);
      }
    };
    logTrace('0_entrou_controller');

    const uploadSingle = winauditUpload.single(winauditFileField);
    logTrace('1_antes_multer_single');

    uploadSingle(req, res, async (err) => {
      try {
        logTrace('2_multer_callback', {
          hasErr: !!err,
          errCode: typeof err?.code === 'string' ? err.code : null,
          errMsg: typeof err?.message === 'string' ? err.message : null,
          multerCbChegou: true,
        });

        if (err) {
          const estruturado = buildWinauditFileError(err);
          const publico = new Error(estruturado.message);
          publico.statusCode = estruturado.statusCode;
          publico.code = estruturado.code;
          publico.causaRaiz = {
            multerCode: typeof err?.code === 'string' ? err.code : null,
            multerField: typeof err?.field === 'string' ? err.field : null,
            multerStorageErrors: Array.isArray(err?.errors)
              ? err.errors.map((e) => ({ code: typeof e.code === 'string' ? e.code : null, field: typeof e.field === 'string' ? e.field : null }))
              : null,
            mensagemOriginal: typeof err?.message === 'string' ? err.message : null,
          };
          throw publico;
        }

        logTrace('3_depois_multer_sem_erro', {
          fileOriginal: req.file
            ? { originalname: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype }
            : null,
          bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : null,
        });

        if (!req.file) {
          const e = new Error('Nenhum arquivo selecionado para importação.');
          e.statusCode = 400;
          e.code = 'WINAUDIT_MISSING_FILE';
          throw e;
        }

        const ipOrigem = extrairIpOrigem(req);
        const tipoArquivo = extrairTipoArquivo(req.file);

        logTrace('4_chamando_gerarPreview');

        const preview = await WinAuditImportService.gerarPreview({
          file: req.file,
          usuarioId: req.usuario.id,
          escolaId: typeof req.body?.escolaId === 'string' && req.body.escolaId
            ? req.body.escolaId
            : req.usuario.escolaId || null,
          prisma,
          ipOrigem,
          tipoArquivo,
          versaoImportador: WINAUDIT_VERSION,
        });

        logTrace('5_sucesso_preview', { previewId: preview?.previewId || null });

        return res.status(200).json(preview);
      } catch (error) {
        try {
          if (req.log) {
            req.log.error(
              {
                err: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
                context: {
                  codigo: error?.code,
                  status: error?.statusCode,
                  arquivo: req.file
                    ? {
                        originalname: req.file.originalname,
                        size: req.file.size,
                        mimetype: req.file.mimetype,
                      }
                    : null,
                  usuarioId: req?.usuario?.id ?? null,
                  escolaId: req?.usuario?.escolaId ?? null,
                  etapaFalha: error?.causaRaiz ? 'multer' : 'gerarPreview',
                },
              },
              'winaudit:preview:erro',
            );
          } else {
            console.error('[winaudit:preview:erro]', error);
            if (error?.stack) console.error(error.stack);
          }
        } catch {
          // ignore logger failure
        }
        if (!error.code) error.code = 'WINAUDIT_PREVIEW_ERROR';
        if (!error.statusCode) error.statusCode = 500;
        return next(error);
      }
    });
  } catch (outerError) {
    // Captura erros síncronos FORA do callback do multer (antes do uploadSingle rodar)
    try {
      if (req.log) {
        req.log.error(
          { err: outerError instanceof Error ? { name: outerError.name, message: outerError.message, stack: outerError.stack } : outerError },
          '[winaudit:preview] ERRO_SINCRONO_FORA_MULTER',
        );
      } else {
        console.error('[winaudit:preview] ERRO_SINCRONO_FORA_MULTER', outerError);
      }
    } catch { /* ignore */ }
    if (!outerError.code) outerError.code = 'WINAUDIT_PREVIEW_OUTER_ERROR';
    if (!outerError.statusCode) outerError.statusCode = 500;
    return next(outerError);
  }
};

export const importarWinAuditConfirmar = async (req, res, next) => {
  try {
    const { previewId, equipamento, macSelecionado, ignorarDuplicidade } = req.body || {};

    const resultado = await WinAuditImportService.confirmarImportacao({
      previewId,
      usuario: req.usuario,
      equipamento,
      macSelecionado,
      ignorarDuplicidade,
      prisma,
    });

    return res.status(201).json(resultado);
  } catch (error) {
    if (!error.code) error.code = 'WINAUDIT_CONFIRMAR_ERROR';
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const listarLogsImportacoes = async (req, res, next) => {
  try {
    const listagem = await WinAuditImportService.listarLogs({
      usuario: req.usuario,
      pagina: req.query?.pagina,
      porPagina: req.query?.porPagina,
      filtros: extrairFiltrosDeQuery(req.query),
      prisma,
    });
    return res.status(200).json(listagem);
  } catch (error) {
    if (!error.code) error.code = 'WINAUDIT_LOGS_ERROR';
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const obterLogImportacaoPorId = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    const log = await WinAuditImportService.obterLogPorId({
      id,
      usuario: req.usuario,
      prisma,
    });
    return res.status(200).json(log);
  } catch (error) {
    if (!error.code) error.code = 'WINAUDIT_LOG_DETAIL_ERROR';
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export default {
  importarWinAuditPreview,
  importarWinAuditConfirmar,
  listarLogsImportacoes,
  obterLogImportacaoPorId,
};
