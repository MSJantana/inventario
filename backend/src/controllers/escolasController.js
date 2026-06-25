import { prisma } from '../index.js';
import { getAccessibleSchoolIds, hasSchoolAccess } from '../utils/schoolAccess.js';

// Listar todas as escolas
export const listarEscolas = async (req, res, next) => {
  try {
    if (req.usuario?.role === 'ADMIN') {
      const escolas = await prisma.escola.findMany();
      return res.json(escolas);
    }

    const escolaIds = getAccessibleSchoolIds(req.usuario);
    if (escolaIds.length === 0) {
      return res.json([]);
    }
    const escolas = await prisma.escola.findMany({
      where: { id: { in: escolaIds } },
      orderBy: { nome: 'asc' },
    });
    return res.json(escolas);
  } catch (error) {
    next(error);
  }
};

// Obter uma escola específica
export const obterEscola = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!hasSchoolAccess(req.usuario, id)) {
      return res.status(403).json({ error: 'Acesso restrito à sua escola' });
    }

    const escola = await prisma.escola.findUnique({
      where: { id },
      include: {
        equipamentos: true,
        movimentacoes: true
      }
    });

    if (!escola) {
      return res.status(404).json({ error: 'Escola não encontrada' });
    }

    res.json(escola);
  } catch (error) {
    next(error);
  }
};

// Criar uma nova escola
export const criarEscola = async (req, res, next) => {
  try {
    if (req.usuario?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas ADMIN pode criar escolas' });
    }
    const { nome, endereco, telefone, email } = req.body;

    const escola = await prisma.escola.create({
      data: {
        nome,
        endereco,
        telefone,
        email
      }
    });

    res.status(201).json(escola);
  } catch (error) {
    next(error);
  }
};

// Atualizar uma escola
export const atualizarEscola = async (req, res, next) => {
  try {
    if (req.usuario?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas ADMIN pode atualizar escolas' });
    }
    const { id } = req.params;
    const { nome, endereco, telefone, email } = req.body;

    // Verificar se a escola existe
    const escolaExistente = await prisma.escola.findUnique({
      where: { id }
    });

    if (!escolaExistente) {
      return res.status(404).json({ error: 'Escola não encontrada' });
    }

    // Atualizar a escola
    const escola = await prisma.escola.update({
      where: { id },
      data: {
        nome,
        endereco,
        telefone,
        email
      }
    });

    res.json(escola);
  } catch (error) {
    next(error);
  }
};

// Excluir uma escola
export const excluirEscola = async (req, res, next) => {
  try {
    if (req.usuario?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas ADMIN pode excluir escolas' });
    }
    const { id } = req.params;

    // Verificar se a escola existe
    const escola = await prisma.escola.findUnique({
      where: { id },
      include: {
        equipamentos: true,
        movimentacoes: true
      }
    });

    if (!escola) {
      return res.status(404).json({ error: 'Escola não encontrada' });
    }

    // Verificar se há equipamentos ou movimentações associados
    if (escola.equipamentos.length > 0 || escola.movimentacoes.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir a escola pois existem equipamentos ou movimentações associados' 
      });
    }

    // Excluir a escola
    await prisma.escola.delete({
      where: { id }
    });

    res.json({ message: 'Escola excluída com sucesso' });
  } catch (error) {
    next(error);
  }
};
