/**
 * Serviço Central de Movimentações (7Inventory)
 * ---------------------------------------------
 * Responsável por:
 *  - Garantir ATOMICIDADE (prisma.$transaction) entre criação da movimentação + atualização equipamento.
 *  - Aplicar regras de transição de status (via movimentacaoStatus.js).
 *  - Garantir ESCOPO DE ESCOLA (usuário só altera equipamento de sua escola, a menos de ADMIN).
 *  - Proibir alteração destrutiva (DELETE vira estorno auditável).
 *  - Criar snapshots (antes/depois) em JSON.
 *  - Encapsular lógica de manutenção/doação/emprestimo/estorno/transferencia/devolução.
 *
 * NENHUMA operação de escrita em Movimentacao NEM em Equipamento.status/escopo deve passar por fora daqui.
 */

import PrismaClientModule from '@prisma/client';
import {
  validarTransicaoStatus as _validarTransicaoStatus,
  TIPO_PARA_STATUS_ALVO as _TIPO_PARA_STATUS_ALVO,
  STATUS_FINAIS,
} from '../utils/movimentacaoStatus.js';

const { PrismaClient } = PrismaClientModule;
let prismaCached;

export const getPrisma = (input) => {
  if (input?.$transaction !== undefined) return input;
  if (input?.equipamento !== undefined) return input;
  if (prismaCached) return prismaCached;
  prismaCached = new PrismaClient();
  return prismaCached;
};

export const TIPO_PARA_STATUS_ALVO = _TIPO_PARA_STATUS_ALVO;
export const validarTransicaoStatus = _validarTransicaoStatus;

const classErrorApp = (message, status, codigo) => {
  const err = new Error(message);
  err.status = status || 500;
  err.codigo = codigo || null;
  err.isApp = true;
  return err;
};

/**
 * Monta snapshot resumido do equipamento (para auditoria).
 */
export const montarSnapshot = (eq) => {
  if (!eq) return null;
  return {
    id: eq.id,
    tipo: eq.tipo,
    modeloOriginal: eq.modelo || eq.modeloOriginal,
    marca: eq.fabricante || eq.marca,
    serial: eq.serial,
    patrimonio: eq.patrimonio,
    status: eq.status,
    escolaId: eq.escolaId,
    localizacao: eq.localizacao,
    setor: eq.setor,
    responsavel: eq.responsavel,
    dataAquisicao: eq.dataAquisicao ? String(eq.dataAquisicao) : null,
    updatedAt: eq.updatedAt ? String(eq.updatedAt) : null,
  };
};

/**
 * Normaliza entrada.
 */
const normalizarDadosMov = (body) => {
  const saida = {};
  ['equipamentoId','tipoMovimento','origem','destino','escolaId','observacoes','responsavel'].forEach((k) => {
    const valor = body?.[k];
    if (valor !== undefined && valor !== null) saida[k] = String(valor);
  });
  if (body?.statusDestino !== undefined && body?.statusDestino !== null) {
    saida.statusDestino = String(body.statusDestino);
  }
  if (body?.dataMovimento) saida.dataMovimento = new Date(body.dataMovimento);
  if (typeof body?.manutencao === 'object' && body.manutencao) saida.manutencao = body.manutencao;
  if (typeof body?.doacao === 'object' && body.doacao) saida.doacao = body.doacao;
  if (typeof body?.emprestimo === 'object' && body.emprestimo) saida.emprestimo = body.emprestimo;
  if (typeof body?.transferencia === 'object' && body.transferencia) saida.transferencia = body.transferencia;
  if (typeof body?.ajusteEquipamento === 'object' && body.ajusteEquipamento) saida.ajusteEquipamento = body.ajusteEquipamento;
  if (body?.motivoEstorno) saida.motivoEstorno = String(body.motivoEstorno);
  return saida;
};

/**
 * Equivalente ao hasSchoolAccess + resolveManagedSchoolId do middleware.
 * Valida se o usuário pode escrever no equipamento.
 */
export const usuarioPodeAtuarNoEquipamento = (usuario, equipamento) => {
  if (!usuario) return { ok: false, status: 401, msg: 'Usuário não autenticado.' };
  if (usuario.role === 'ADMIN') return { ok: true, admin: true };
  if (!equipamento.escolaId) {
    return { ok: false, status: 403, msg: 'Equipamento sem escola. Apenas ADMIN pode movimentar.' };
  }
  if (usuario.escolaId && equipamento.escolaId === usuario.escolaId) return { ok: true, admin: false };
  return { ok: false, status: 403, msg: 'Escopo de escola violado: equipamento não pertence à sua unidade.' };
};

/**
 * Aplica update em EQUIPAMENTO (status, localização, escola, setor, responsavel)
 * com base no TIPO e em dados extras (transferencia, emprestimo, manutencao retorno, etc).
 *
 * Funções auxiliares abaixo extraem cada ramo por tipo de movimento para
 * manter a complexidade cognitiva da função principal abaixo do limite (S3776).
 */

const STATUS_EQUIPAMENTO_VALIDOS = Object.freeze([
  'DISPONIVEL','EM_USO','EM_MANUTENCAO','DESCARTADO','RESERVADO','EMPRESTADO','DOADO',
]);

const CAMPOS_PERMITIDOS_AJUSTE = Object.freeze([
  'nome','patrimonio','escolaId','tipo','status','modelo','serial','dataAquisicao',
  'localizacao','macaddress','fabricante','marca','processador','memoria','observacoes',
  'usuarioNome','setor','responsavel',
]);

const CAMPOS_AJUSTE_ACEITA_VAZIO = new Set([
  'observacoes','macaddress','dataAquisicao','processador','memoria',
  'usuarioNome','setor','responsavel',
]);

const aplicarStatusUpdate = (updates, equipamentoAtual, proximoStatus) => {
  if (!proximoStatus) return;
  if (equipamentoAtual.status === proximoStatus) return;
  updates.status = proximoStatus;
};

const montarUpdateTransferencia = (equipamentoAtual, dadosMov) => {
  const updates = {};
  if (!dadosMov.escolaId) return updates;
  if (dadosMov.escolaId === equipamentoAtual.escolaId) return updates;
  updates.escolaId = dadosMov.escolaId;
  const locDestino = dadosMov.transferencia?.localizacaoDestino || dadosMov.destino;
  if (locDestino) updates.localizacao = String(locDestino);
  if (dadosMov.transferencia?.setorDestino) {
    updates.setor = String(dadosMov.transferencia.setorDestino);
  }
  if (dadosMov.transferencia?.responsavelDestino) {
    updates.responsavel = String(dadosMov.transferencia.responsavelDestino);
  }
  return updates;
};

const montarUpdateEmprestimo = (equipamentoAtual, dadosMov) => {
  const updates = {};
  const e = dadosMov.emprestimo;
  if (!e) return updates;
  if (e.beneficiarioNome) updates.localizacao = '[EMPRÉSTIMO] ' + e.beneficiarioNome;
  const obs = [];
  if (e.responsavelContato) obs.push('Empréstimo: ' + e.responsavelContato);
  if (!obs.length) return updates;
  const prefixo = equipamentoAtual.observacoes ? equipamentoAtual.observacoes + ' | ' : '';
  updates.observacoes = prefixo + obs.join(' | ');
  return updates;
};

const montarUpdateDevolucao = (equipamentoAtual) => {
  const updates = {};
  const loc = (equipamentoAtual.localizacao || '').replace(/^\[EMPRÉSTIMO\]\s*/i, '');
  updates.localizacao = loc.trim() ? loc : null;
  return updates;
};

const montarUpdateSaida = (dadosMov) => {
  const updates = {};
  if (dadosMov.destino) updates.localizacao = dadosMov.destino;
  return updates;
};

const validarDataAquisicao = (valorStr) => {
  if (!valorStr) return { valido: true, data: null };
  const dt = new Date(valorStr);
  if (Number.isNaN(dt.getTime())) return { valido: false };
  return { valido: true, data: dt };
};

const aplicarCampoAjuste = (updates, campo, valor) => {
  if (valor === undefined || valor === null) return;
  const valorStr = String(valor).trim();
  const aceitaVazio = CAMPOS_AJUSTE_ACEITA_VAZIO.has(campo);
  if (!valorStr && !aceitaVazio) return;

  switch (campo) {
    case 'status': {
      const statusUpper = String(valor).toUpperCase();
      if (!STATUS_EQUIPAMENTO_VALIDOS.includes(statusUpper)) return;
      updates.status = statusUpper;
      return;
    }
    case 'dataAquisicao': {
      const val = validarDataAquisicao(valorStr);
      if (!val.valido) return;
      updates.dataAquisicao = val.data;
      return;
    }
    case 'escolaId': {
      updates.escolaId = valorStr || null;
      return;
    }
    default: {
      if (!valorStr && aceitaVazio) {
        updates[campo] = null;
        return;
      }
      updates[campo] = valorStr;
    }
  }
};

const aplicarAliasMarcaFabricante = (updates, ajusteEquip) => {
  if (!updates) return;
  const fabricanteVemDeAjuste = ajusteEquip.fabricante !== undefined;
  const marcaVemDeAjuste = ajusteEquip.marca !== undefined;
  if (!fabricanteVemDeAjuste && marcaVemDeAjuste && updates.marca !== undefined && updates.fabricante === undefined) {
    updates.fabricante = updates.marca;
  }
  if (!marcaVemDeAjuste && fabricanteVemDeAjuste && updates.fabricante !== undefined && updates.marca === undefined) {
    updates.marca = updates.fabricante;
  }
};

const montarUpdateAjuste = (dadosMov) => {
  const updates = {};
  const aj = dadosMov.ajusteEquipamento;
  if (!aj || typeof aj !== 'object') return updates;
  for (const campo of CAMPOS_PERMITIDOS_AJUSTE) {
    aplicarCampoAjuste(updates, campo, aj[campo]);
  }
  aplicarAliasMarcaFabricante(updates, aj);
  return updates;
};

const montarUpdatePorTipo = (equipamentoAtual, tipoMovimento, dadosMov) => {
  switch (tipoMovimento) {
    case 'TRANSFERENCIA': return montarUpdateTransferencia(equipamentoAtual, dadosMov);
    case 'EMPRESTIMO': return montarUpdateEmprestimo(equipamentoAtual, dadosMov);
    case 'DEVOLUCAO': return montarUpdateDevolucao(equipamentoAtual);
    case 'SAIDA': return montarUpdateSaida(dadosMov);
    case 'AJUSTE': return montarUpdateAjuste(dadosMov);
    default: return {};
  }
};

const mesclarUpdates = (...parciais) => {
  const resultado = {};
  for (const p of parciais) {
    if (!p || typeof p !== 'object') continue;
    const chaves = Object.keys(p);
    for (const k of chaves) {
      resultado[k] = p[k];
    }
  }
  return Object.keys(resultado).length ? resultado : null;
};

const montarUpdateEquipamento = (equipamentoAtual, tipoMovimento, dadosMov, proximoStatus) => {
  const updatesStatus = {};
  aplicarStatusUpdate(updatesStatus, equipamentoAtual, proximoStatus);
  const updatesTipo = montarUpdatePorTipo(equipamentoAtual, tipoMovimento, dadosMov);
  return mesclarUpdates(updatesStatus, updatesTipo);
};

/**
 * Cria movimentação + atualiza equipamento em TRANSACTION.
 */
export const criarMovimentacao = async (dadosMovRaw, usuario, opcoes) => {
  const prisma = getPrisma();
  const forcar = Boolean(opcoes?.forcar);
  const dadosMov = normalizarDadosMov(dadosMovRaw);
  if (!dadosMov.equipamentoId) throw classErrorApp('equipamentoId é obrigatório.', 400);
  if (!dadosMov.tipoMovimento) throw classErrorApp('tipoMovimento é obrigatório.', 400);

  const equipamento = await prisma.equipamento.findUnique({ where: { id: dadosMov.equipamentoId } });
  if (!equipamento) throw classErrorApp('Equipamento não encontrado.', 404);

  const perm = usuarioPodeAtuarNoEquipamento(usuario, equipamento);
  if (!perm.ok) throw classErrorApp(perm.msg, perm.status || 403);

  const opcoesValidacao = { forcar };
  if (dadosMov?.statusDestino) {
    opcoesValidacao.statusDestino = String(dadosMov.statusDestino);
  }
  const transicao = validarTransicaoStatus(equipamento.status, dadosMov.tipoMovimento, opcoesValidacao);
  if (!transicao.valido) throw classErrorApp(transicao.mensagem, 400, transicao.codigo);

  const snapshotAntes = montarSnapshot(equipamento);
  const updatesEquip = montarUpdateEquipamento(equipamento, dadosMov.tipoMovimento, dadosMov, transicao.proximoStatus);

  let responsavelFinal = dadosMov.responsavel;
  if (!responsavelFinal) {
    responsavelFinal = usuario?.nome ?? 'Sistema';
  }
  const usuarioId = usuario?.id ?? null;

  // Fallback AJUSTE: origem/destino garantidos a partir do equipamento ANTES/DEPOIS
  if (dadosMov.tipoMovimento === 'AJUSTE') {
    const aj = typeof dadosMov.ajusteEquipamento === 'object' && dadosMov.ajusteEquipamento ? dadosMov.ajusteEquipamento : null;
    if (!dadosMov.origem) {
      const origemLocal = (equipamento?.localizacao && String(equipamento.localizacao).trim()) || null;
      dadosMov.origem = origemLocal;
    }
    if (!dadosMov.destino) {
      const destinoPorAjuste = (aj?.localizacao && String(aj.localizacao).trim()) || null;
      const destinoFinal = destinoPorAjuste || (equipamento?.localizacao && String(equipamento.localizacao).trim()) || null;
      dadosMov.destino = destinoFinal;
    }
    // escolaId: se ajuste alterou escolaId, garante escolaId do movimento = escola destino
    if (aj?.escolaId !== undefined && aj?.escolaId !== null && !dadosMov.escolaId) {
      const escolaStr = String(aj.escolaId).trim();
      if (escolaStr) dadosMov.escolaId = escolaStr;
    }
  }

  return prisma.$transaction(async (tx) => {
    const include = {};
    if (dadosMov.manutencao) {
      const m = dadosMov.manutencao;
      include.manutencao = {
        create: {
          tipoServico: m.tipoServico ?? null,
          tecnicoResponsavel: m.tecnicoResponsavel ?? null,
          fornecedorNome: m.fornecedorNome ?? null,
          fornecedorContato: m.fornecedorContato ?? null,
          numeroOS: m.numeroOS ?? null,
          prazoRetorno: m.prazoRetorno ? new Date(m.prazoRetorno) : null,
          dataRetornoEfetiva: m.dataRetornoEfetiva ? new Date(m.dataRetornoEfetiva) : null,
          pecasTrocadas: m.pecasTrocadas ?? null,
          valorServico: m.valorServico ?? null,
          laudoTecnico: m.laudoTecnico ?? null,
          movimentacaoEnvioId: m.movimentacaoEnvioId ? String(m.movimentacaoEnvioId) : null,
          escolaId: m.escolaId ?? equipamento.escolaId ?? null,
        },
      };
    }
    if (dadosMov.doacao) {
      if (!dadosMov.doacao.beneficiarioNome) throw classErrorApp('beneficiarioNome é obrigatório em doações.', 400);
      const d = dadosMov.doacao;
      include.doacao = {
        create: {
          beneficiarioNome: String(d.beneficiarioNome),
          beneficiarioCpfCnpj: d.beneficiarioCpfCnpj ?? null,
          beneficiarioContato: d.beneficiarioContato ?? null,
          enderecoEntrega: d.enderecoEntrega ?? null,
          termoDoacaoUrl: d.termoDoacaoUrl ?? null,
          numeroPortaria: d.numeroPortaria ?? null,
          dataEntregaEfetiva: d.dataEntregaEfetiva ? new Date(d.dataEntregaEfetiva) : null,
          responsavelEntrega: d.responsavelEntrega ?? null,
          observacoesInternas: d.observacoesInternas ?? null,
          escolaId: d.escolaId ?? equipamento.escolaId ?? null,
        },
      };
    }
    if (dadosMov.emprestimo) {
      if (!dadosMov.emprestimo.beneficiarioNome) throw classErrorApp('emprestimo.beneficiarioNome é obrigatório.', 400);
      const e = dadosMov.emprestimo;
      include.emprestimo = {
        create: {
          beneficiarioNome: String(e.beneficiarioNome),
          beneficiarioDocumento: e.beneficiarioDocumento ?? null,
          beneficiarioContato: e.beneficiarioContato ?? null,
          tomadorNome: e.tomadorNome ?? null,
          tomadorCargo: e.tomadorCargo ?? null,
          localDestino: e.localDestino ?? null,
          dataSaida: e.dataSaida ? new Date(e.dataSaida) : null,
          dataPrevistaDevolucao: e.dataPrevistaDevolucao ? new Date(e.dataPrevistaDevolucao) : null,
          dataDevolucaoEfetiva: e.dataDevolucaoEfetiva ? new Date(e.dataDevolucaoEfetiva) : null,
          estadoConservacaoSaida: e.estadoConservacaoSaida ?? null,
          estadoConservacaoRetorno: e.estadoConservacaoRetorno ?? null,
          termoAssinado: e.termoAssinado == null ? false : Boolean(e.termoAssinado),
          termoUrl: e.termoUrl ?? null,
          observacoesInternas: e.observacoesInternas ?? null,
          movimentacaoSaidaId: e.movimentacaoSaidaId ? String(e.movimentacaoSaidaId) : null,
          escolaId: e.escolaId ?? equipamento.escolaId ?? null,
        },
      };
    }

    const dadosMovCriar = {
      equipamentoId: dadosMov.equipamentoId,
      tipoMovimento: dadosMov.tipoMovimento,
      responsavel: responsavelFinal,
      origem: dadosMov.origem ?? equipamento.localizacao ?? equipamento.escolaId ?? null,
      destino: dadosMov.destino ?? null,
      escolaId: dadosMov.escolaId ?? equipamento.escolaId ?? null,
      observacoes: dadosMov.observacoes ?? null,
      dataMovimento: dadosMov.dataMovimento ?? new Date(),
      usuarioId,
      snapshotAntes,
      ...include,
    };

    const movimentacao = await tx.movimentacao.create({
      data: dadosMovCriar,
      include: { escola: true, manutencao: true, doacao: true, emprestimo: true },
    });

    let equipamentoAtualizado = equipamento;
    if (updatesEquip) {
      equipamentoAtualizado = await tx.equipamento.update({
        where: { id: equipamento.id },
        data: updatesEquip,
      });
    }

    const snapshotDepois = montarSnapshot(equipamentoAtualizado);
    const movimentacaoFinal = await tx.movimentacao.update({
      where: { id: movimentacao.id },
      data: { snapshotDepois },
      include: { escola: true, manutencao: true, doacao: true, emprestimo: true, usuario: true },
    });

    return { movimentacao: movimentacaoFinal, equipamentoAtualizado, transicao };
  }, { isolationLevel: 'ReadCommitted' });
};

/**
 * Atualizar movimentação consolidada: PERMITE APENAS campos administrativos.
 */
export const atualizarMovimentacao = async (movimentacaoId, body, usuario) => {
  const prisma = getPrisma();
  if (!movimentacaoId) throw classErrorApp('movimentacaoId é obrigatório.', 400);
  const movAtual = await prisma.movimentacao.findUnique({
    where: { id: String(movimentacaoId) },
    include: { equipamento: true, manutencao: true, doacao: true },
  });
  if (!movAtual) throw classErrorApp('Movimentação não encontrada.', 404);
  if (movAtual.estornado) throw classErrorApp('Movimentação estornada. Não pode ser editada.', 400);

  const perm = usuarioPodeAtuarNoEquipamento(usuario, movAtual.equipamento);
  if (!perm.ok) throw classErrorApp(perm.msg, perm.status || 403);

  const updatesMov = {};
  const dados = normalizarDadosMov(body);
  if (dados.observacoes !== undefined) updatesMov.observacoes = dados.observacoes;
  if (dados.responsavel !== undefined) updatesMov.responsavel = dados.responsavel;
  if (dados.dataMovimento) updatesMov.dataMovimento = dados.dataMovimento;

  const camposBloqueados = ['equipamentoId','tipoMovimento','escolaId'];
  for (const k of camposBloqueados) {
    const valor = body?.[k];
    if (valor !== undefined && String(valor) !== String(movAtual[k])) {
      throw classErrorApp('Campo ' + k + ' não pode ser alterado em movimentação consolidada. Use estorno + novo movimento.', 400);
    }
  }

  return prisma.$transaction(async (tx) => {
    if (dados.manutencao) {
      const data = dados.manutencao;
      const prazo = data.prazoRetorno ? new Date(data.prazoRetorno) : null;
      const retorno = data.dataRetornoEfetiva ? new Date(data.dataRetornoEfetiva) : null;
      const envioId = data.movimentacaoEnvioId ? String(data.movimentacaoEnvioId) : null;
      if (movAtual.manutencao) {
        await tx.movimentacaoManutencao.update({
          where: { movimentacaoId: movAtual.id },
          data: {
            tipoServico: data.tipoServico ?? movAtual.manutencao.tipoServico,
            tecnicoResponsavel: data.tecnicoResponsavel ?? movAtual.manutencao.tecnicoResponsavel,
            fornecedorNome: data.fornecedorNome ?? movAtual.manutencao.fornecedorNome,
            fornecedorContato: data.fornecedorContato ?? movAtual.manutencao.fornecedorContato,
            numeroOS: data.numeroOS ?? movAtual.manutencao.numeroOS,
            prazoRetorno: prazo ?? movAtual.manutencao.prazoRetorno,
            dataRetornoEfetiva: retorno ?? movAtual.manutencao.dataRetornoEfetiva,
            pecasTrocadas: data.pecasTrocadas ?? movAtual.manutencao.pecasTrocadas,
            valorServico: data.valorServico ?? movAtual.manutencao.valorServico,
            laudoTecnico: data.laudoTecnico ?? movAtual.manutencao.laudoTecnico,
            movimentacaoEnvioId: envioId ?? movAtual.manutencao.movimentacaoEnvioId,
          },
        });
      } else {
        await tx.movimentacaoManutencao.create({
          data: {
            movimentacaoId: movAtual.id,
            tipoServico: data.tipoServico ?? null,
            tecnicoResponsavel: data.tecnicoResponsavel ?? null,
            fornecedorNome: data.fornecedorNome ?? null,
            fornecedorContato: data.fornecedorContato ?? null,
            numeroOS: data.numeroOS ?? null,
            prazoRetorno: prazo,
            dataRetornoEfetiva: retorno,
            pecasTrocadas: data.pecasTrocadas ?? null,
            valorServico: data.valorServico ?? null,
            laudoTecnico: data.laudoTecnico ?? null,
            movimentacaoEnvioId: envioId,
            escolaId: movAtual.equipamento.escolaId ?? null,
          },
        });
      }
    }
    if (dados.doacao) {
      const data = dados.doacao;
      if (movAtual.doacao) {
        await tx.movimentacaoDoacao.update({
          where: { movimentacaoId: movAtual.id },
          data: {
            beneficiarioNome: data.beneficiarioNome ?? movAtual.doacao.beneficiarioNome,
            beneficiarioCpfCnpj: data.beneficiarioCpfCnpj ?? movAtual.doacao.beneficiarioCpfCnpj,
            beneficiarioContato: data.beneficiarioContato ?? movAtual.doacao.beneficiarioContato,
            enderecoEntrega: data.enderecoEntrega ?? movAtual.doacao.enderecoEntrega,
            termoDoacaoUrl: data.termoDoacaoUrl ?? movAtual.doacao.termoDoacaoUrl,
            numeroPortaria: data.numeroPortaria ?? movAtual.doacao.numeroPortaria,
            dataEntregaEfetiva: data.dataEntregaEfetiva ? new Date(data.dataEntregaEfetiva) : movAtual.doacao.dataEntregaEfetiva,
            responsavelEntrega: data.responsavelEntrega ?? movAtual.doacao.responsavelEntrega,
            observacoesInternas: data.observacoesInternas ?? movAtual.doacao.observacoesInternas,
          },
        });
      } else {
        if (!data.beneficiarioNome) throw classErrorApp('beneficiarioNome obrigatório para doação.', 400);
        await tx.movimentacaoDoacao.create({
          data: {
            movimentacaoId: movAtual.id,
            beneficiarioNome: String(data.beneficiarioNome),
            beneficiarioCpfCnpj: data.beneficiarioCpfCnpj ?? null,
            beneficiarioContato: data.beneficiarioContato ?? null,
            enderecoEntrega: data.enderecoEntrega ?? null,
            termoDoacaoUrl: data.termoDoacaoUrl ?? null,
            numeroPortaria: data.numeroPortaria ?? null,
            dataEntregaEfetiva: data.dataEntregaEfetiva ? new Date(data.dataEntregaEfetiva) : null,
            responsavelEntrega: data.responsavelEntrega ?? null,
            observacoesInternas: data.observacoesInternas ?? null,
            escolaId: movAtual.equipamento.escolaId ?? null,
          },
        });
      }
    }

    const nova = Object.keys(updatesMov).length > 0
      ? await tx.movimentacao.update({
          where: { id: movAtual.id },
          data: updatesMov,
          include: { escola: true, manutencao: true, doacao: true, usuario: true },
        })
      : await tx.movimentacao.findUnique({
          where: { id: movAtual.id },
          include: { escola: true, manutencao: true, doacao: true, usuario: true },
        });

    return { movimentacao: nova };
  });
};

/**
 * ESTORNO AUDITÁVEL.
 */
export const estornarMovimentacao = async (movimentacaoId, motivo, usuario, opcoes) => {
  const prisma = getPrisma();
  if (!movimentacaoId) throw classErrorApp('movimentacaoId obrigatório.', 400);
  if (!motivo || String(motivo).trim().length < 3) {
    throw classErrorApp('Motivo de estorno é obrigatório (mínimo 3 caracteres).', 400);
  }
  const mov = await prisma.movimentacao.findUnique({
    where: { id: String(movimentacaoId) },
    include: { equipamento: true },
  });
  if (!mov) throw classErrorApp('Movimentação não encontrada.', 404);
  if (mov.estornado) throw classErrorApp('Movimentação já estava estornada.', 400);
  if (mov.tipoMovimento === 'AJUSTE') throw classErrorApp('Não estornar movimento de ajuste (é estorno).', 400);

  const perm = usuarioPodeAtuarNoEquipamento(usuario, mov.equipamento);
  if (!perm.ok) throw classErrorApp(perm.msg, perm.status || 403);
  if (usuario.role !== 'ADMIN' && usuario.role !== 'GESTOR') {
    throw classErrorApp('Apenas ADMIN ou GESTOR podem estornar movimentações.', 403);
  }

  const snapAntesOriginal = (mov.snapshotAntes && typeof mov.snapshotAntes === 'object')
    ? mov.snapshotAntes
    : montarSnapshot(mov.equipamento);
  const statusAlvoEstorno = snapAntesOriginal.status || 'DISPONIVEL';

  const equipamentoAtual = await prisma.equipamento.findUnique({ where: { id: mov.equipamentoId } });
  if (!equipamentoAtual) throw classErrorApp('Equipamento não existe mais.', 404);
  if (STATUS_FINAIS.has(equipamentoAtual.status)) {
    throw classErrorApp('Equipamento está em status final (' + equipamentoAtual.status + '). Estorno não permitido.', 400);
  }

  const voltaCampos = {};
  if (snapAntesOriginal.escolaId && snapAntesOriginal.escolaId !== equipamentoAtual.escolaId) {
    voltaCampos.escolaId = snapAntesOriginal.escolaId;
  }
  if (snapAntesOriginal.localizacao && snapAntesOriginal.localizacao !== equipamentoAtual.localizacao) {
    voltaCampos.localizacao = snapAntesOriginal.localizacao;
  }
  if (snapAntesOriginal.setor && snapAntesOriginal.setor !== equipamentoAtual.setor) {
    voltaCampos.setor = snapAntesOriginal.setor;
  }
  if (snapAntesOriginal.responsavel && snapAntesOriginal.responsavel !== equipamentoAtual.responsavel) {
    voltaCampos.responsavel = snapAntesOriginal.responsavel;
  }
  if (statusAlvoEstorno && statusAlvoEstorno !== equipamentoAtual.status) {
    voltaCampos.status = statusAlvoEstorno;
  }

  const dadosAjuste = {
    equipamentoId: mov.equipamentoId,
    tipoMovimento: 'AJUSTE',
    escolaId: equipamentoAtual.escolaId ?? null,
    origem: mov.destino ?? null,
    destino: mov.origem ?? null,
    dataMovimento: new Date(),
    observacoes: 'ESTORNO de Mov. #' + mov.id + ' (' + mov.tipoMovimento + ') - ' + String(motivo).trim(),
    motivoEstorno: String(motivo).trim(),
  };

  return prisma.$transaction(async (tx) => {
    await tx.movimentacao.update({
      where: { id: mov.id },
      data: {
        estornado: true,
        estornadoEm: new Date(),
        estornadoPorUsuarioId: usuario?.id ?? null,
        motivoEstorno: String(motivo).trim(),
      },
    });

    const snapA = montarSnapshot(equipamentoAtual);
    const movAjuste = await tx.movimentacao.create({
      data: {
        equipamentoId: dadosAjuste.equipamentoId,
        tipoMovimento: 'AJUSTE',
        responsavel: usuario?.nome ?? 'Sistema',
        origem: dadosAjuste.origem,
        destino: dadosAjuste.destino,
        escolaId: dadosAjuste.escolaId,
        observacoes: dadosAjuste.observacoes,
        dataMovimento: dadosAjuste.dataMovimento,
        usuarioId: usuario?.id ?? null,
        snapshotAntes: snapA,
      },
    });

    let equipAtualizado = equipamentoAtual;
    if (Object.keys(voltaCampos).length > 0) {
      equipAtualizado = await tx.equipamento.update({
        where: { id: equipamentoAtual.id },
        data: voltaCampos,
      });
    }

    await tx.movimentacao.update({
      where: { id: movAjuste.id },
      data: { snapshotDepois: montarSnapshot(equipAtualizado), movimentacaoEstornoId: mov.id },
      include: { escola: true },
    });

    await tx.movimentacao.update({
      where: { id: mov.id },
      data: { movimentacaoEstornoId: movAjuste.id },
    });

    return {
      estornado: true,
      movimentacaoOriginal: mov.id,
      movimentacaoAjuste: movAjuste.id,
      equipamentoAtualizado: equipAtualizado,
    };
  });
};

// ======= Helpers endpoints ESPECIALIZADOS =======
export const criarManutencaoEnvio = async (body, usuario) => {
  const dados = normalizarDadosMov(body);
  dados.tipoMovimento = 'MANUTENCAO_ENVIO';
  return criarMovimentacao(dados, usuario);
};
export const criarManutencaoRetorno = async (body, usuario) => {
  const dados = normalizarDadosMov(body);
  dados.tipoMovimento = 'MANUTENCAO_RETORNO';
  if (body?.statusDestino) {
    dados.statusDestino = String(body.statusDestino);
  }
  if (dados.manutencao && !dados.manutencao.dataRetornoEfetiva) {
    dados.manutencao.dataRetornoEfetiva = new Date();
  }
  return criarMovimentacao(dados, usuario);
};
export const criarEmprestimo = async (body, usuario) => {
  const dados = normalizarDadosMov(body);
  dados.tipoMovimento = 'EMPRESTIMO';
  if (!dados.emprestimo?.beneficiarioNome) {
    throw classErrorApp('emprestimo.beneficiarioNome é obrigatório.', 400);
  }
  return criarMovimentacao(dados, usuario);
};
export const criarDevolucao = async (body, usuario) => {
  const dados = normalizarDadosMov(body);
  dados.tipoMovimento = 'DEVOLUCAO';
  if (body?.statusDestino) {
    dados.statusDestino = String(body.statusDestino);
  }
  return criarMovimentacao(dados, usuario);
};
export const criarDoacao = async (body, usuario) => {
  const dados = normalizarDadosMov(body);
  dados.tipoMovimento = 'DOACAO';
  if (!dados.doacao?.beneficiarioNome) {
    throw classErrorApp('doacao.beneficiarioNome é obrigatório.', 400);
  }
  return criarMovimentacao(dados, usuario);
};
export const criarTransferencia = async (body, usuario) => {
  const dados = normalizarDadosMov(body);
  dados.tipoMovimento = 'TRANSFERENCIA';
  if (!dados.escolaId) {
    if (dados.transferencia?.escolaIdDestino) {
      dados.escolaId = String(dados.transferencia.escolaIdDestino);
    } else {
      throw classErrorApp('escolaId (destino) é obrigatório em transferência.', 400);
    }
  }
  return criarMovimentacao(dados, usuario);
};

/**
 * Listar movimentações com filtros do relatório.
 */
export const listarMovimentacoesRelatorio = async (where, page, perPage) => {
  const prisma = getPrisma();
  const safePerPage = Math.max(1, Math.min(1000, Number(perPage || 50)));
  const safePage = Math.max(1, Number(page || 1));
  const skip = (safePage - 1) * safePerPage;
  const [itemsRaw, total] = await Promise.all([
    prisma.movimentacao.findMany({
      where,
      skip,
      take: safePerPage,
      orderBy: [{ dataMovimento: 'desc' }, { id: 'desc' }],
      include: {
        equipamento: { select: { id:true, nome:true, tipo:true, modelo:true, fabricante:true, serial:true, patrimonio:true, status:true, localizacao:true, escolaId:true, usuarioNome:true, setor:true, responsavel:true } },
        escola: { select: { id:true, nome:true, sigla:true } },
        usuario: { select: { id:true, nome:true, email:true, role:true } },
        manutencao: {
          include: {
            movimentacaoEnvio: {
              select: { id:true, tipoMovimento:true, dataMovimento:true, observacoes:true,
                usuario: { select: { id:true, nome:true } } },
            },
          },
        },
        doacao: true,
        emprestimo: {
          include: {
            movimentacaoSaida: {
              select: { id:true, tipoMovimento:true, dataMovimento:true, observacoes:true,
                usuario: { select: { id:true, nome:true } } },
            },
          },
        },
        movimentacaoEstorno: { select: { id:true, dataMovimento:true, observacoes:true, estornado:true, motivoEstorno:true, estornadoPorUsuarioId:true, estornadoEm:true } },
      },
    }),
    prisma.movimentacao.count({ where }),
  ]);
  const items = itemsRaw.map((m) => {
    if (m?.equipamento) {
      const eq = m.equipamento;
      m.equipamento = {
        ...eq,
        modeloOriginal: eq.modelo,
        marca: eq.fabricante,
      };
    }
    return m;
  });
  return {
    page: safePage,
    perPage: safePerPage,
    total,
    totalPages: Math.ceil(total / safePerPage),
    items,
  };
};

/**
 * Monta where com escopo escola + filtros de relatório.
 */
export const montarWhereFiltros = (filtros, usuario) => {
  const w = { AND: [] };
  const escolaId = filtros?.escolaId ? String(filtros.escolaId) : null;
  if (usuario?.role !== 'ADMIN' && usuario?.escolaId) {
    w.AND.push({ OR: [{ escolaId: usuario.escolaId }, { equipamento: { escolaId: usuario.escolaId } }] });
  }
  if (escolaId) {
    w.AND.push({ OR: [{ escolaId }, { equipamento: { escolaId } }] });
  }
  if (filtros) {
    if (filtros.tipoMovimento) w.AND.push({ tipoMovimento: String(filtros.tipoMovimento) });
    if (filtros.usuarioId) w.AND.push({ usuarioId: String(filtros.usuarioId) });
    if (filtros.equipamentoId) w.AND.push({ equipamentoId: String(filtros.equipamentoId) });
    if (filtros.patrimonio) w.AND.push({ equipamento: { patrimonio: { contains: String(filtros.patrimonio) } } });
    if (filtros.serial) w.AND.push({ equipamento: { serial: { contains: String(filtros.serial) } } });
    if (filtros.periodoInicio || filtros.periodoFim) {
      const dataWhere = {};
      if (filtros.periodoInicio) dataWhere.gte = new Date(String(filtros.periodoInicio).replace(/Z$/, '') + 'T00:00:00.000Z');
      if (filtros.periodoFim) dataWhere.lte = new Date(String(filtros.periodoFim).replace(/Z$/, '') + 'T23:59:59.999Z');
      w.AND.push({ dataMovimento: dataWhere });
    }
    if (filtros.estornado !== undefined && filtros.estornado !== null && filtros.estornado !== '') {
      w.AND.push({ estornado: (String(filtros.estornado) === 'true' || filtros.estornado === true || filtros.estornado === 1) });
    }
  }
  return w.AND.length ? w : {};
};

const MovimentacaoService = {
  criarMovimentacao,
  atualizarMovimentacao,
  estornarMovimentacao,
  criarManutencaoEnvio,
  criarManutencaoRetorno,
  criarEmprestimo,
  criarDevolucao,
  criarDoacao,
  criarTransferencia,
  listarMovimentacoesRelatorio,
  montarWhereFiltros,
  montarSnapshot,
  usuarioPodeAtuarNoEquipamento,
  validarTransicaoStatus,
  TIPO_PARA_STATUS_ALVO,
};

export default MovimentacaoService;
