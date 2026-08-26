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
  winauditUpload.single(winauditFileField)(req, res, async (err) => {
    try {
      if (err) {
        const estruturado = buildWinauditFileError(err);
        const publico = new Error(estruturado.message);
        publico.statusCode = estruturado.statusCode;
        publico.code = estruturado.code;
        throw publico;
      }

      if (!req.file) {
        const e = new Error('Nenhum arquivo selecionado para importação.');
        e.statusCode = 400;
        e.code = 'WINAUDIT_MISSING_FILE';
        throw e;
      }

      const ipOrigem = extrairIpOrigem(req);
      const tipoArquivo = extrairTipoArquivo(req.file);

      const preview = await WinAuditImportService.gerarPreview({
        file: req.file,
        usuarioId: req.usuario.id,
        escolaId: req.body?.escolaId || req.usuario.escolaId || null,
        prisma,
        ipOrigem,
        tipoArquivo,
        versaoImportador: WINAUDIT_VERSION,
      });

      return res.status(200).json(preview);
    } catch (error) {
      if (!error.code) error.code = 'WINAUDIT_PREVIEW_ERROR';
      if (!error.statusCode) error.statusCode = 500;
      return next(error);
    }
  });
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
