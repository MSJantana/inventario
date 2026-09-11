import PrismaClientModule from '@prisma/client';
import path from 'node:path';
import { chromeosUpload, chromeosFileField, buildChromeosFileError } from '../middlewares/upload.js';
import ChromeOSImportService from '../services/ChromeOSImportService.js';

const { PrismaClient } = PrismaClientModule;

const prisma = new PrismaClient();

const CHROMEOS_VERSION = process.env.CHROMEOS_IMPORTER_VERSION || '1.0.0';

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
  if (mimetype.includes('csv')) return 'CSV';
  const ext = path.extname(file.originalname || '').replace('.', '').toUpperCase();
  if (ext === 'CSV') return 'CSV';
  return ext || null;
};

export const importarChromeosPreview = (req, res, next) => {
  try {
    const logTrace = (etapa, extra) => {
      const payload = {
        etapa,
        contentType: req.headers?.['content-type'] || null,
        contentLength: Number(req.headers?.['content-length']) || 0,
        hasFile: !!req.file,
        bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : null,
        usuarioId: req?.usuario?.id || null,
        ...(extra ?? undefined),
      };
      try {
        if (req.log) {
          req.log.info(payload, '[chromeos:preview]');
        } else {
          console.log('[chromeos:preview]', JSON.stringify(payload, (k, v) => (typeof v === 'bigint' ? Number(v) : v)));
        }
      } catch {
        console.log('[chromeos:preview]', etapa);
      }
    };
    logTrace('0_entrou_controller');

    const uploadSingle = chromeosUpload.single(chromeosFileField);
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
          const estruturado = buildChromeosFileError(err);
          const publico = new Error(estruturado.message);
          publico.statusCode = estruturado.statusCode;
          publico.code = estruturado.code;
          publico.causaRaiz = {
            multerCode: typeof err?.code === 'string' ? err.code : null,
            multerField: typeof err?.field === 'string' ? err.field : null,
            multerStorageErrors: Array.isArray(err?.errors)
              ? err.errors.map((e) => ({
                code: typeof e.code === 'string' ? e.code : null,
                field: typeof e.field === 'string' ? e.field : null,
              }))
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
          e.code = 'CHROMEOS_MISSING_FILE';
          throw e;
        }

        const ipOrigem = extrairIpOrigem(req);
        const tipoArquivo = extrairTipoArquivo(req.file);

        logTrace('4_chamando_gerarPreview');

        const preview = await ChromeOSImportService.gerarPreview({
          file: req.file,
          usuarioId: req.usuario.id,
          escolaId: typeof req.body?.escolaId === 'string' && req.body.escolaId
            ? req.body.escolaId
            : req.usuario.escolaId || null,
          prisma,
          ipOrigem,
          tipoArquivo,
          versaoImportador: CHROMEOS_VERSION,
        });

        logTrace('5_sucesso_preview', { previewId: preview?.previewId || null });

        return res.status(200).json(preview);
      } catch (error) {
        try {
          if (req.log) {
            req.log.error(
              {
                err: error instanceof Error
                  ? { name: error.name, message: error.message, stack: error.stack }
                  : error,
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
              'chromeos:preview:erro',
            );
          } else {
            console.error('[chromeos:preview:erro]', error);
            if (error?.stack) console.error(error.stack);
          }
        } catch {
          // ignore logger failure
        }
        if (!error.code) error.code = 'CHROMEOS_PREVIEW_ERROR';
        if (!error.statusCode) error.statusCode = 500;
        return next(error);
      }
    });
  } catch (outerError) {
    try {
      if (req.log) {
        req.log.error(
          {
            err: outerError instanceof Error
              ? { name: outerError.name, message: outerError.message, stack: outerError.stack }
              : outerError,
          },
          '[chromeos:preview] ERRO_SINCRONO_FORA_MULTER',
        );
      } else {
        console.error('[chromeos:preview] ERRO_SINCRONO_FORA_MULTER', outerError);
      }
    } catch { /* ignore */ }
    if (!outerError.code) outerError.code = 'CHROMEOS_PREVIEW_OUTER_ERROR';
    if (!outerError.statusCode) outerError.statusCode = 500;
    return next(outerError);
  }
};

export const importarChromeosConfirmar = async (req, res, next) => {
  try {
    const { previewId, itens } = req.body || {};

    try {
      if (req.log) {
        req.log.info({
          etapa: 'confirmar_entrou',
          previewId: typeof previewId === 'string' ? previewId : null,
          itensCount: Array.isArray(itens) ? itens.length : null,
          itensAmostra: Array.isArray(itens)
            ? itens.slice(0, 3).map((it) => ({
              indiceLinha: it?.indiceLinha ?? null,
              selecionado: it?.selecionado ?? null,
              escolaResolvidaId: typeof it?.escolaResolvidaId === 'string' && it.escolaResolvidaId ? '[set]' : '[nao]',
              ignorarDuplicidade: it?.ignorarDuplicidade ?? null,
              overridesKeys: it?.overrides && typeof it.overrides === 'object'
                ? Object.keys(it.overrides)
                : null,
            }))
            : null,
          bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : null,
          usuarioId: req?.usuario?.id || null,
          usuarioRole: req?.usuario?.role || null,
        }, '[chromeos:confirmar:input]');
      } else {
        console.log('[chromeos:confirmar:input] previewId=', previewId, 'itens=', Array.isArray(itens) ? itens.length : 'NÃO-ARRAY');
      }
    } catch { /* ignore */ }

    const resultado = await ChromeOSImportService.confirmarImportacao({
      previewId,
      itens,
      usuario: req.usuario,
      prisma,
    });

    return res.status(201).json(resultado);
  } catch (error) {
    try {
      if (req.log) {
        req.log.error({
          etapa: 'confirmar_erro',
          errorName: error instanceof Error ? error.name : null,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : null,
          prismaMeta: typeof error?.meta === 'object' ? error.meta : null,
          prismaCode: typeof error?.code === 'string' ? error.code : null,
          codigo: error?.code ?? null,
          status: error?.statusCode ?? null,
          fieldsInvalidos:
            (error && typeof error.message === 'string'
              && /missing required|value too long|invalid for|cannot be used|argument/i.test(error.message))
              ? error.message.slice(0, 400)
              : null,
          usuarioId: req?.usuario?.id ?? null,
          previewId: typeof req?.body?.previewId === 'string' ? req.body.previewId : null,
          itensCount: Array.isArray(req?.body?.itens) ? req.body.itens.length : null,
        }, '[chromeos:confirmar:erro]');
      } else {
        console.error('[chromeos:confirmar:erro]', error);
        if (error?.stack) console.error(error.stack);
        if (error?.meta) console.error('[chromeos:confirmar:prisma.meta]', JSON.stringify(error.meta));
      }
    } catch {
      // ignore logger failure
    }
    if (!error.code) error.code = 'CHROMEOS_CONFIRMAR_ERROR';
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export default {
  importarChromeosPreview,
  importarChromeosConfirmar,
};
