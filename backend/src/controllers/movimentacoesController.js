import { prisma } from '../index.js';

const mapTipoToStatus = (tipo) => {
  switch (tipo) {
    case 'ENTRADA':
      return 'DISPONIVEL';
    case 'SAIDA':
      return 'EM_USO';
    case 'MANUTENCAO':
      return 'EM_MANUTENCAO';
    case 'DESCARTE':
      return 'DESCARTADO';
    case 'TRANSFERENCIA':
      return undefined;
    default:
      return undefined;
  }
};

// Listar todas as movimentações
export const listarMovimentacoes = async (req, res, next) => {
  try {
    const isAdmin = req.usuario?.role === 'ADMIN';
    const where = !isAdmin ? { escolaId: req.usuario?.escolaId || undefined } : {};
    const movimentacoes = await prisma.movimentacao.findMany({
      where,
      include: {
        equipamento: true,
        escola: true
      }
    });
    const response = movimentacoes.map(m => ({
      ...m,
      tipo: m.tipoMovimento,
      data: m.dataMovimento,
      descricao: m.observacoes,
    }));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Obter uma movimentação específica
export const obterMovimentacao = async (req, res, next) => {
  try {
    const { id } = req.params;
    const movimentacao = await prisma.movimentacao.findUnique({
      where: { id },
      include: {
        equipamento: true,
        escola: true
      }
    });

    if (!movimentacao) {
      return res.status(404).json({ error: 'Movimentação não encontrada' });
    }

    if (req.usuario?.role !== 'ADMIN' && movimentacao.escolaId !== req.usuario?.escolaId) {
      return res.status(403).json({ error: 'Acesso restrito à movimentações da sua escola' });
    }

    const response = {
      ...movimentacao,
      tipo: movimentacao.tipoMovimento,
      data: movimentacao.dataMovimento,
      descricao: movimentacao.observacoes,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Criar uma nova movimentação
export const criarMovimentacao = async (req, res, next) => {
  try {
    const { equipamentoId, usuarioId, tipo, origem, destino, data, descricao } = req.body;

    // GESTOR só pode criar para a própria escola
    if (req.usuario?.role === 'GESTOR' && req.body.escolaId && req.body.escolaId !== req.usuario?.escolaId) {
      return res.status(403).json({ error: 'Gestor só pode registrar movimentações na própria escola' });
    }

    // Obter nome do usuário que está logado para preencher responsavel
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: { nome: true }
    });

    const movimentacao = await prisma.movimentacao.create({
      data: {
        equipamentoId,
        responsavel: usuario?.nome ?? 'Desconhecido',
        tipoMovimento: tipo,
        origem,
        destino,
        dataMovimento: new Date(data),
        observacoes: descricao,
        escolaId: req.body.escolaId ?? req.usuario?.escolaId
      },
      include: {
        equipamento: true,        
        escola: true
      }
    });

    const novoStatus = mapTipoToStatus(tipo);
    if (novoStatus) {
      try {
        await prisma.equipamento.update({
          where: { id: equipamentoId },
          data: { status: novoStatus }
        });
      } catch (_) {}
    }

    const response = {
      ...movimentacao,
      tipo: movimentacao.tipoMovimento,
      data: movimentacao.dataMovimento,
      descricao: movimentacao.observacoes,
    };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// Atualizar uma movimentação
export const atualizarMovimentacao = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { equipamentoId, tipo, data, descricao } = req.body;

    // Verificar se a movimentação existe
    const movimentacaoExistente = await prisma.movimentacao.findUnique({
      where: { id }
    });

    if (!movimentacaoExistente) {
      return res.status(404).json({ error: 'Movimentação não encontrada' });
    }

    if (req.usuario?.role === 'GESTOR' && movimentacaoExistente.escolaId !== req.usuario?.escolaId) {
      return res.status(403).json({ error: 'Acesso restrito à movimentações da sua escola' });
    }

    // Atualizar a movimentação
    const movimentacao = await prisma.movimentacao.update({
      where: { id },
      data: {
        equipamentoId,
        tipoMovimento: tipo,
        dataMovimento: data ? new Date(data) : undefined,
        observacoes: descricao,
        escolaId: movimentacaoExistente.escolaId
      },
      include: {
        equipamento: true,
        escola: true
      }
    });

    const tipoParaStatus = tipo || movimentacaoExistente.tipoMovimento;
    const statusAtualizado = mapTipoToStatus(tipoParaStatus);
    const equipamentoAlvo = equipamentoId || movimentacaoExistente.equipamentoId;
    if (statusAtualizado && equipamentoAlvo) {
      try {
        await prisma.equipamento.update({
          where: { id: equipamentoAlvo },
          data: { status: statusAtualizado }
        });
      } catch (_) {}
    }

    const response = {
      ...movimentacao,
      tipo: movimentacao.tipoMovimento,
      data: movimentacao.dataMovimento,
      descricao: movimentacao.observacoes,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Excluir uma movimentação
export const excluirMovimentacao = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar se a movimentação existe
    const movimentacao = await prisma.movimentacao.findUnique({
      where: { id }
    });

    if (!movimentacao) {
      return res.status(404).json({ error: 'Movimentação não encontrada' });
    }

    // GESTOR só pode excluir da própria escola
    if (req.usuario?.role === 'GESTOR' && movimentacao.escolaId !== req.usuario?.escolaId) {
      return res.status(403).json({ error: 'Acesso restrito à movimentações da sua escola' });
    }

    // Excluir a movimentação
    await prisma.movimentacao.delete({
      where: { id }
    });

    res.json({ message: 'Movimentação excluída com sucesso' });
  } catch (error) {
    next(error);
  }
};