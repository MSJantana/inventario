import { prisma } from '../index.js';
// Helper simples para formatar data em YYYY-MM-DD sem dependências externas
const formatDateYYYYMMDD = (dateLike) => {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Listar todos os equipamentos
export const listarEquipamentos = async (req, res, next) => {
  try {
    const isAdmin = req.usuario?.role === 'ADMIN';
    const where = isAdmin ? {} : { escolaId: req.usuario?.escolaId || undefined };
    const equipamentos = await prisma.equipamento.findMany({
      where,
      include: {
        escola: true,
        movimentacoes: true
      }
    });
    res.json(equipamentos);
  } catch (error) {
    next(error);
  }
};

// Obter um equipamento específico
export const obterEquipamento = async (req, res, next) => {
  try {
    const { id } = req.params;
    const equipamento = await prisma.equipamento.findUnique({
      where: { id },
      include: {
        escola: true,
        movimentacoes: true
      }
    });

    if (!equipamento) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    // Restringe acesso por escola para não-admin
    if (req.usuario?.role !== 'ADMIN' && equipamento.escolaId !== req.usuario?.escolaId) {
      return res.status(403).json({ error: 'Acesso restrito a equipamentos da sua escola' });
    }

    res.json(equipamento);
  } catch (error) {
    next(error);
  }
};

// Criar um novo equipamento
export const criarEquipamento = async (req, res, next) => {
  try {
    const { nome, tipo, modelo, localizacao, fabricante, processador, memoria, serial, macaddress, dataAquisicao, status, observacoes } = req.body;

    // GESTOR/TECNICO criam sempre na própria escola
    const escolaId = (req.usuario?.role === 'GESTOR' || req.usuario?.role === 'TECNICO')
      ? req.usuario?.escolaId
      : req.body.escolaId;

    const equipamento = await prisma.equipamento.create({
      data: {
        nome,
        tipo,
        modelo,
        localizacao,
        fabricante,
        processador,
        memoria,
        serial,
        macaddress,
        dataAquisicao: new Date(dataAquisicao),
        status,
        observacoes,
        escolaId
      }
    });

    res.status(201).json(equipamento);
  } catch (error) {
    next(error);
  }
};

// Atualizar um equipamento
export const atualizarEquipamento = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, tipo, modelo, localizacao, fabricante, processador, memoria, serial, macaddress, dataAquisicao, status, observacoes } = req.body;

    // Verificar se o equipamento existe
    const equipamentoExistente = await prisma.equipamento.findUnique({
      where: { id }
    });

    if (!equipamentoExistente) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    // Restringe atualização a equipamentos da mesma escola para não-admin
    if (req.usuario?.role !== 'ADMIN' && equipamentoExistente.escolaId !== req.usuario?.escolaId) {
      return res.status(403).json({ error: 'Acesso restrito à sua escola' });
    }

    // TECNICO: atualização parcial permitida
    let dataUpdate;
    if (req.usuario?.role === 'TECNICO') {
      dataUpdate = {
        status,
        localizacao,
        observacoes,
      };
    } else if (req.usuario?.role === 'GESTOR') {
      // GESTOR: atualização completa, mas sempre dentro da própria escola
      dataUpdate = {
        nome,
        tipo,
        modelo,
        localizacao,
        fabricante,
        processador,
        memoria,
        observacoes,
        serial,
        macaddress,
        dataAquisicao: dataAquisicao ? new Date(dataAquisicao) : undefined,
        status,
        escolaId: req.usuario?.escolaId,
      };
    } else {
      // ADMIN: atualização completa (pode mudar escolaId se necessário via body)
      dataUpdate = {
        nome,
        tipo,
        modelo,
        localizacao,
        fabricante,
        processador,
        memoria,
        observacoes,
        serial,
        macaddress,
        dataAquisicao: dataAquisicao ? new Date(dataAquisicao) : undefined,
        status,
        // escolaId só é alterado pelo ADMIN se vier no body
        escolaId: req.body.escolaId ?? equipamentoExistente.escolaId,
      };
    }

    // Atualizar o equipamento
    const equipamento = await prisma.equipamento.update({
      where: { id },
      data: dataUpdate
    });

    res.json(equipamento);
  } catch (error) {
    next(error);
  }
};

// Excluir um equipamento
export const excluirEquipamento = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar se o equipamento existe
    const equipamento = await prisma.equipamento.findUnique({
      where: { id },
      include: {
        movimentacoes: true
      }
    });

    if (!equipamento) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    // Verificar se o equipamento tem movimentações associadas
    if (equipamento.movimentacoes.length > 0) {
      return res.status(400).json({
        error: 'Não é possível excluir o equipamento pois existem movimentações associadas'
      });
    }

    // Verificar permissão
    if (req.usuario?.role === 'TECNICO') {
      return res.status(403).json({ error: 'TECNICO não pode excluir equipamentos' });
    }
    if (req.usuario?.role === 'GESTOR' && equipamento.escolaId !== req.usuario?.escolaId) {
      return res.status(403).json({ error: 'Apenas equipamentos da sua escola podem ser excluídos' });
    }

    await prisma.equipamento.delete({ where: { id } });

    res.json({ message: 'Equipamento excluído com sucesso' });
  } catch (error) {
    next(error);
  }
};

// Exportar equipamentos em CSV
export const exportarEquipamentosCsv = async (req, res, next) => {
  try {
    const isAdmin = req.usuario?.role === 'ADMIN';
    const where = isAdmin ? {} : { escolaId: req.usuario?.escolaId || undefined };
    const equipamentos = await prisma.equipamento.findMany({
      where,
      include: { escola: true }
    });

    // Cabeçalho CSV
    const headers = [
      'id','nome','tipo','modelo','serial','macaddress','status','localizacao','fabricante','processador','memoria','dataAquisicao','observacoes','escolaId','escolaNome'
    ];

    const escapeCsv = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      // Se contém vírgula, aspas ou quebra de linha, encapsula em aspas e escapa aspas
      if (/[,"\n\r]/.test(str)) {
        return '"' + str.replaceAll('"', '""') + '"';
      }
      return str;
    };

    const rows = equipamentos.map((e) => [
      e.id,
      e.nome,
      e.tipo,
      e.modelo,
      e.serial,
      e.macaddress ?? '',
      e.status,
      e.localizacao ?? '',
      e.fabricante ?? '',
      e.processador ?? '',
      e.memoria ?? '',
      formatDateYYYYMMDD(e.dataAquisicao),
      e.observacoes ?? '',
      e.escolaId ?? '',
      e.escola?.nome ?? ''
    ].map(escapeCsv).join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="equipamentos.csv"');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};