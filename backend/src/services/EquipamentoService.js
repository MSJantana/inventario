import PrismaClientModule from '@prisma/client';
import { resolveManagedSchoolId, hasSchoolAccess } from '../utils/schoolAccess.js';
import {
  normalizarTexto,
  normalizarSerial,
  normalizarNome,
  normalizarUsuarioNome,
  normalizarMacEntrada,
  converterMemoriaParaMB,
  salvarMemoriaComoMB,
} from '../utils/winaudit/normalizers.js';

const { PrismaClient } = PrismaClientModule;

let prismaCached;

const getPrisma = (input) => {
  if (input?.$transaction !== undefined) return input;
  if (input?.equipamento !== undefined) return input;
  if (prismaCached) return prismaCached;
  prismaCached = new PrismaClient();
  return prismaCached;
};

const CAMPOS_OBRIGATORIOS_CRIAR = ['nome', 'tipo', 'modelo', 'serial', 'dataAquisicao', 'usuarioNome'];

export const validarCamposObrigatorios = (payload) => {
  const ausentes = CAMPOS_OBRIGATORIOS_CRIAR.filter((campo) => {
    const valor = payload[campo];
    if (valor === null || valor === undefined) return true;
    if (typeof valor === 'string' && valor.trim() === '') return true;
    if (campo === 'dataAquisicao') {
      const d = new Date(valor);
      return Number.isNaN(d.getTime());
    }
    return false;
  });
  return {
    valido: ausentes.length === 0,
    ausentes,
    mensagem: ausentes.length > 0 ? `Campos obrigatórios ausentes: ${ausentes.join(', ')}.` : null,
  };
};

export const prepararPayloadEquipamento = (input) => {
  const p = input || {};
  const macResult = normalizarMacEntrada(p.macaddress || '');
  const memoriaRaw = p.memoria;
  const memoriaResult = converterMemoriaParaMB(memoriaRaw || '');

  const payloadNormalizado = {
    nome: normalizarNome(p.nome),
    patrimonio: normalizarTexto(p.patrimonio) || undefined,
    tipo: normalizarTexto(p.tipo),
    modelo: normalizarTexto(p.modelo),
    localizacao: normalizarTexto(p.localizacao) || undefined,
    fabricante: normalizarTexto(p.fabricante) || undefined,
    processador: normalizarTexto(p.processador) || undefined,
    memoria: memoriaResult.valido ? salvarMemoriaComoMB(memoriaResult.megabytes) : (normalizarTexto(p.memoria) || undefined),
    serial: normalizarSerial(p.serial),
    macaddress: macResult.valido ? macResult.valor : (normalizarTexto(p.macaddress) || undefined),
    dataAquisicao: p.dataAquisicao,
    status: normalizarTexto(p.status) || undefined,
    observacoes: normalizarTexto(p.observacoes) || undefined,
    usuarioNome: normalizarUsuarioNome(p.usuarioNome),
  };

  return {
    payloadNormalizado,
    memoriaResult,
    macResult,
  };
};

export const resolverEscolaIdParaCriacao = (usuario, requestedSchoolId) => {
  if (!usuario) {
    return { escolaId: requestedSchoolId || null, valido: true, erro: null };
  }
  if (usuario.role === 'GESTOR' || usuario.role === 'TECNICO') {
    const escolaId = resolveManagedSchoolId(usuario, requestedSchoolId);
    if (!escolaId) {
      return {
        escolaId: null,
        valido: false,
        erro: 'Acesso restrito às escolas vinculadas ao usuário.',
      };
    }
    return { escolaId, valido: true, erro: null };
  }
  if (requestedSchoolId && !hasSchoolAccess(usuario, requestedSchoolId)) {
    return {
      escolaId: requestedSchoolId,
      valido: false,
      erro: 'Usuário não tem acesso à escola selecionada.',
    };
  }
  return { escolaId: requestedSchoolId || usuario.escolaId || null, valido: true, erro: null };
};

export const criarEquipamento = async (input) => {
  const { payload, usuario, prisma: prismaInput, transactionClient } = input || {};
  const prisma = getPrisma(transactionClient || prismaInput);
  const { payloadNormalizado, macResult } = prepararPayloadEquipamento(payload);

  const validacao = validarCamposObrigatorios(payloadNormalizado);
  if (!validacao.valido) {
    const erro = new Error(validacao.mensagem);
    erro.statusCode = 400;
    erro.code = 'EQUIPAMENTO_CAMPOS_OBRIGATORIOS';
    erro.camposAusentes = validacao.ausentes;
    throw erro;
  }

  if (payload.macaddress !== undefined && !macResult.valido && payload.macaddress !== null && payload.macaddress !== '') {
    const erro = new Error(macResult.mensagem || 'MAC Address inválido.');
    erro.statusCode = 400;
    erro.code = 'EQUIPAMENTO_MAC_INVALIDO';
    throw erro;
  }

  const escolaResolvido = resolverEscolaIdParaCriacao(usuario, payload.escolaId);
  if (!escolaResolvido.valido) {
    const erro = new Error(escolaResolvido.erro);
    erro.statusCode = 403;
    erro.code = 'EQUIPAMENTO_ESCOLA_INVALIDA';
    throw erro;
  }

  const data = {
    nome: payloadNormalizado.nome,
    patrimonio: payloadNormalizado.patrimonio,
    tipo: payloadNormalizado.tipo,
    modelo: payloadNormalizado.modelo,
    localizacao: payloadNormalizado.localizacao,
    fabricante: payloadNormalizado.fabricante,
    processador: payloadNormalizado.processador,
    memoria: payloadNormalizado.memoria,
    serial: payloadNormalizado.serial,
    macaddress: payloadNormalizado.macaddress,
    dataAquisicao: new Date(payloadNormalizado.dataAquisicao),
    status: payloadNormalizado.status || undefined,
    observacoes: payloadNormalizado.observacoes,
    usuarioNome: payloadNormalizado.usuarioNome,
    escolaId: escolaResolvido.escolaId || undefined,
  };

  const equipamento = await prisma.equipamento.create({ data });
  return {
    equipamento,
    payloadNormalizado,
    escolaId: escolaResolvido.escolaId,
  };
};

export default {
  criarEquipamento,
  prepararPayloadEquipamento,
  resolverEscolaIdParaCriacao,
  validarCamposObrigatorios,
};
