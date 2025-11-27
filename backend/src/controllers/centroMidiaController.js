import { prisma } from '../index.js';

export const listarCentroMidia = async (req, res, next) => {
  try {
    const isAdmin = req.usuario?.role === 'ADMIN';
    const where = isAdmin ? {} : { escolaId: req.usuario?.escolaId || undefined };
    const itens = await prisma.centroMidia.findMany({
      where,
      include: { escola: true }
    });
    res.json(itens);
  } catch (error) {
    next(error);
  }
};

export const obterCentroMidia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await prisma.centroMidia.findUnique({
      where: { id },
      include: { escola: true }
    });
    if (!item) return res.status(404).json({ error: 'Item não encontrado' });

    if (req.usuario?.role !== 'ADMIN' && item.escolaId !== req.usuario?.escolaId) {
      return res.status(403).json({ error: 'Acesso restrito à sua escola' });
    }
    res.json(item);
  } catch (error) {
    next(error);
  }
};

export const criarCentroMidia = async (req, res, next) => {
  try {
    const { nome, tipo, modelo, serial } = req.body;
    const escolaId = req.body.escolaId || null;
    const item = await prisma.centroMidia.create({
      data: { nome, tipo, modelo, serial, escolaId }
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

export const atualizarCentroMidia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existente = await prisma.centroMidia.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ error: 'Item não encontrado' });

    if (req.usuario?.role !== 'ADMIN' && existente.escolaId !== req.usuario?.escolaId) {
      return res.status(403).json({ error: 'Acesso restrito à sua escola' });
    }

    const { nome, tipo, modelo, serial, escolaId, status } = req.body;
    const item = await prisma.centroMidia.update({
      where: { id },
      data: {
        nome: nome ?? existente.nome,
        tipo: tipo ?? existente.tipo,
        modelo: modelo ?? existente.modelo,
        serial: serial ?? existente.serial,
        status: status ?? existente.status,
        escolaId: req.usuario?.role === 'ADMIN' ? (escolaId ?? existente.escolaId) : existente.escolaId,
      }
    });
    res.json(item);
  } catch (error) {
    next(error);
  }
};

export const excluirCentroMidia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existente = await prisma.centroMidia.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ error: 'Item não encontrado' });
    if (req.usuario?.role !== 'ADMIN' && existente.escolaId !== req.usuario?.escolaId) {
      return res.status(403).json({ error: 'Acesso restrito à sua escola' });
    }
    await prisma.centroMidia.delete({ where: { id } });
    res.json({ message: 'Item excluído com sucesso' });
  } catch (error) {
    next(error);
  }
};

