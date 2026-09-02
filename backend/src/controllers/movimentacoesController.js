/**
 * Controlador de Movimentações (Refatorado 2026-08-31)
 * ------------------------------------------------------
 * - Usa MovimentacaoService (transação atomicidade + regras status + escopo escola).
 * - Mantém 100% compatibilidade com payloads antigos (tipo, data, descricao)
 *   e campos novos (tipoMovimento, dataMovimento, observacoes).
 * - DELETE /:id agora é ESTORNO AUDITÁVEL (não apaga linha).
 * - Adiciona endpoints especializados e relatório.
 */

import { hasSchoolAccess, resolveManagedSchoolId } from '../utils/schoolAccess.js';
import {
  criarMovimentacao as serviceCriar,
  atualizarMovimentacao as serviceAtualizar,
  estornarMovimentacao as serviceEstornar,
  criarManutencaoEnvio,
  criarManutencaoRetorno,
  criarEmprestimo,
  criarDevolucao,
  criarDoacao,
  criarTransferencia,
  listarMovimentacoesRelatorio,
  montarWhereFiltros,
  getPrisma,
} from '../services/MovimentacaoService.js';

const includesMovimentacaoCompleta = {
  equipamento: true,
  escola: true,
  manutencao: {
    include: {
      movimentacaoEnvio: {
        select: { id: true, tipoMovimento: true, dataMovimento: true, observacoes: true,
          usuario: { select: { id: true, nome: true } } },
      },
    },
  },
  doacao: true,
  emprestimo: {
    include: {
      movimentacaoSaida: {
        select: { id: true, tipoMovimento: true, dataMovimento: true, observacoes: true,
          usuario: { select: { id: true, nome: true } } },
      },
    },
  },
  usuario: true,
  movimentacaoEstorno: {
    select: { id: true, dataMovimento: true, observacoes: true, estornado: true, motivoEstorno: true, estornadoPorUsuarioId: true, estornadoEm: true },
  },
};

async function obterMovimentacaoCompleta(id) {
  const prisma = getPrisma();
  return prisma.movimentacao.findUnique({ where: { id }, include: includesMovimentacaoCompleta });
}


/**
 * Converte payload antigo ↔ novo (compatibilidade bidirecional).
 */
const normalizarPayloadEntrada = (body, usuario) => {
  const saida = { ...body };
  // Aliases antigos: tipo / data / descricao
  if (!saida.tipoMovimento && saida.tipo) saida.tipoMovimento = saida.tipo;
  if (!saida.dataMovimento && saida.data) saida.dataMovimento = saida.data;
  if (!saida.observacoes && saida.descricao) saida.observacoes = saida.descricao;
  // Resolve escolaId (gestor -> sua escola; admin -> body; não sobrescreve se já existir)
  if (!saida.escolaId || usuario?.role === 'GESTOR') {
    const escolaResolvida = resolveManagedSchoolId(usuario, saida.escolaId);
    if (escolaResolvida) saida.escolaId = escolaResolvida;
  }
  return saida;
};

const serializarSaida = (m) => {
  if (!m) return m;
  return {
    ...m,
    tipo: m.tipoMovimento,
    data: m.dataMovimento,
    descricao: m.observacoes,
  };
};

const serializarLista = (items) => (items || []).map(serializarSaida);

// ========== Rotas COMPATIBILIDADE ANTIGAS (mantidas funcionando) ==========

export const listarMovimentacoes = async (req, res, next) => {
  try {
    const where = montarWhereFiltros(req.query, req.usuario);
    const page = Number(req.query.page || 1);
    const perPage = Number(req.query.perPage || 50);
    const paginado = await listarMovimentacoesRelatorio(where, page, perPage);
    // Compatibilidade total com response antigo: retorna array plano se NÃO vier ?page
    if (!req.query.page && !req.query.perPage) {
      return res.json(serializarLista(paginado.items));
    }
    return res.json({
      page: paginado.page,
      perPage: paginado.perPage,
      total: paginado.total,
      totalPages: paginado.totalPages,
      items: serializarLista(paginado.items),
    });
  } catch (error) {
    next(error);
  }
};

export const obterMovimentacao = async (req, res, next) => {
  try {
    const { id } = req.params;
    const movimentacao = await obterMovimentacaoCompleta(id);
    if (!movimentacao) {
      return res.status(404).json({ error: 'Movimentação não encontrada' });
    }
    if (!hasSchoolAccess(req.usuario, {
      escolaId: movimentacao.escolaId,
      equipamentoEscolaId: movimentacao.equipamento?.escolaId,
    })) {
      return res.status(403).json({ error: 'Acesso restrito à movimentações da sua escola' });
    }
    res.json(serializarSaida(movimentacao));
  } catch (error) {
    next(error);
  }
};

export const criarMovimentacao = async (req, res, next) => {
  try {
    // GESTOR escola check
    if (req.usuario?.role === 'GESTOR' && req.body.escolaId && !hasSchoolAccess(req.usuario, req.body.escolaId)) {
      return res.status(403).json({ error: 'Gestor só pode registrar movimentações na própria escola' });
    }
    const payload = normalizarPayloadEntrada(req.body, req.usuario);
    if (req.usuario?.role === 'GESTOR' && !payload.escolaId) {
      return res.status(403).json({ error: 'Gestor nao possui escola vinculada para registrar movimentacoes' });
    }
    // Validação: equipamentoId + tipo obrigatórios
    if (!payload.equipamentoId) {
      return res.status(400).json({ error: 'equipamentoId é obrigatório' });
    }
    if (!payload.tipoMovimento) {
      return res.status(400).json({ error: 'tipo (tipoMovimento) é obrigatório' });
    }
    const { movimentacao, transicao } = await serviceCriar(payload, req.usuario);
    const completa = await obterMovimentacaoCompleta(movimentacao.id);
    const response = {
      ...serializarSaida(completa || movimentacao),
      transicaoStatus: transicao || null,
    };
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const atualizarMovimentacao = async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = getPrisma();
    const existente = await prisma.movimentacao.findUnique({
      where: { id },
      include: { equipamento: true },
    });
    if (!existente) {
      return res.status(404).json({ error: 'Movimentação não encontrada' });
    }
    if (req.usuario?.role === 'GESTOR' && !hasSchoolAccess(req.usuario, {
      escolaId: existente.escolaId,
      equipamentoEscolaId: existente.equipamento?.escolaId,
    })) {
      return res.status(403).json({ error: 'Acesso restrito à movimentações da sua escola' });
    }
    const payload = normalizarPayloadEntrada(req.body, req.usuario);
    const { movimentacao } = await serviceAtualizar(id, payload, req.usuario);
    const completa = await obterMovimentacaoCompleta(movimentacao.id);
    return res.json(serializarSaida(completa || movimentacao));
  } catch (error) {
    next(error);
  }
};

// IMPORTANTE: DELETE /:id = ESTORNO (não apaga linha)
export const excluirMovimentacao = async (req, res, next) => {
  try {
    const { id } = req.params;
    const motivo = req.body?.motivo || req.query?.motivo || 'Exclusão solicitada pelo usuário (sem motivo específico)';
    const resultado = await serviceEstornar(id, motivo, req.usuario);
    return res.json({
      message: 'Movimentação estornada com sucesso (auditoria preservada).',
      ...resultado,
    });
  } catch (error) {
    next(error);
  }
};

// ========== Endpoints ESPECIALIZADOS (novos) ==========

const handlerEspecializado = (fn) => async (req, res, next) => {
  try {
    const payload = normalizarPayloadEntrada(req.body, req.usuario);
    const { movimentacao } = await fn(payload, req.usuario);
    const completa = await obterMovimentacaoCompleta(movimentacao.id);
    return res.status(201).json(serializarSaida(completa || movimentacao));
  } catch (error) {
    next(error);
  }
};

export const postManutencaoEnvio = handlerEspecializado(criarManutencaoEnvio);
export const postManutencaoRetorno = handlerEspecializado(criarManutencaoRetorno);
export const postEmprestimo = handlerEspecializado(criarEmprestimo);
export const postDevolucao = handlerEspecializado(criarDevolucao);
export const postDoacao = handlerEspecializado(criarDoacao);
export const postTransferencia = handlerEspecializado(criarTransferencia);

// Estorno explícito (mesmo que DELETE, aceita POST com corpo JSON maior)
export const postEstornar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const motivo = req.body?.motivo || 'Estorno manual';
    const resultado = await serviceEstornar(id, motivo, req.usuario);
    return res.json({ message: 'Estorno aplicado com sucesso.', ...resultado });
  } catch (error) {
    next(error);
  }
};

// ========== Relatório ==========
export const getRelatorio = async (req, res, next) => {
  try {
    const where = montarWhereFiltros(req.query, req.usuario);
    const page = Number(req.query.page || 1);
    const perPage = Number(req.query.perPage || 50);
    const resultado = await listarMovimentacoesRelatorio(where, page, perPage);
    return res.json({
      page: resultado.page,
      perPage: resultado.perPage,
      total: resultado.total,
      totalPages: resultado.totalPages,
      filtrosAplicados: {
        periodoInicio: req.query.periodoInicio || null,
        periodoFim: req.query.periodoFim || null,
        escolaId: req.query.escolaId || null,
        tipoMovimento: req.query.tipoMovimento || null,
        usuarioId: req.query.usuarioId || null,
        equipamentoId: req.query.equipamentoId || null,
        patrimonio: req.query.patrimonio || null,
        serial: req.query.serial || null,
        estornado: req.query.estornado !== undefined && req.query.estornado !== '' ? req.query.estornado : null,
      },
      items: serializarLista(resultado.items),
    });
  } catch (error) {
    next(error);
  }
};

export default {
  listarMovimentacoes,
  obterMovimentacao,
  criarMovimentacao,
  atualizarMovimentacao,
  excluirMovimentacao,
  postManutencaoEnvio,
  postManutencaoRetorno,
  postEmprestimo,
  postDevolucao,
  postDoacao,
  postTransferencia,
  postEstornar,
  getRelatorio,
};
