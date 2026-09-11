import PrismaClientModule from '@prisma/client';
import { parseChromeOsCsv } from '../utils/chromeos/parseCsv.js';
import {
  normalizarLinhaChromeOS,
  montarEquipamentoNormalizado,
  CHROMEOS_IMPORTER_VERSION_STR,
} from '../utils/chromeos/normalizers.js';
import { detectarDuplicidades } from '../utils/winaudit/detectDuplicidades.js';
import EquipamentoService from './EquipamentoService.js';
import { hasSchoolAccess, getSchoolScopeWhere } from '../utils/schoolAccess.js';

const { PrismaClient } = PrismaClientModule;

let prismaCached;

const getPrisma = (input) => {
  if (input?.$transaction !== undefined) return input;
  if (input?.equipamento !== undefined) return input;
  if (prismaCached) return prismaCached;
  prismaCached = new PrismaClient();
  return prismaCached;
};

const STATUS_CAMPO = {
  ENCONTRADO: 'ENCONTRADO',
  NAO_ENCONTRADO: 'NAO_ENCONTRADO',
  INVALIDO: 'INVALIDO',
  DUPLICIDADE: 'POSSIVEL_DUPLICIDADE',
};

const STATUS_IMPORTACAO_ENUM = {
  PREVIEW_GERADO: 'PREVIEW_GERADO',
  SUCESSO: 'SUCESSO',
  CANCELADO: 'CANCELADO',
  ERRO: 'ERRO',
};

const ehCamposEncontradosBooleano = (v) => typeof v === 'boolean';
const ehCamposEncontradosStatus = (v) => typeof v === 'string' && Object.values(STATUS_CAMPO).includes(v);

const contarCamposPorStatus = (camposStatus, status = STATUS_CAMPO.ENCONTRADO) => {
  if (!camposStatus || typeof camposStatus !== 'object') return 0;
  const valores = Object.values(camposStatus);
  const temBooleano = valores.some(ehCamposEncontradosBooleano);
  if (temBooleano) return valores.filter((v) => v === true).length;
  return valores.filter((v) => v === status).length;
};

const contarCamposImportados = (camposStatus) => {
  if (!camposStatus || typeof camposStatus !== 'object') return 0;
  const valores = Object.values(camposStatus);
  const temBooleano = valores.some(ehCamposEncontradosBooleano);
  if (temBooleano) return valores.filter((v) => v === true).length;
  return valores.filter((v) =>
    v === STATUS_CAMPO.ENCONTRADO || v === STATUS_CAMPO.DUPLICIDADE,
  ).length;
};

const registrarLog = async (prisma, payload) => {
  const camposEncontradosRaw = payload.camposEncontrados || {};
  const fonteContagem = payload.camposStatus && typeof payload.camposStatus === 'object'
    ? payload.camposStatus
    : camposEncontradosRaw;

  let qtdCamposEncontrados;
  if (typeof payload.qtdCamposEncontrados === 'number') {
    qtdCamposEncontrados = payload.qtdCamposEncontrados;
  } else if (fonteContagem && typeof fonteContagem === 'object' && !Array.isArray(fonteContagem)) {
    qtdCamposEncontrados = contarCamposPorStatus(fonteContagem);
  } else if (typeof camposEncontradosRaw === 'object' && !Array.isArray(camposEncontradosRaw)) {
    qtdCamposEncontrados = Object.keys(camposEncontradosRaw).length;
  } else {
    qtdCamposEncontrados = 0;
  }

  const qtdCamposImportados = typeof payload.qtdCamposImportados === 'number'
    ? payload.qtdCamposImportados
    : contarCamposImportados(fonteContagem);

  return prisma.importacaoWinAudit.create({
    data: {
      usuarioId: payload.usuarioId,
      escolaId: payload.escolaId ?? null,
      arquivoOriginal: payload.arquivoOriginal,
      tamanhoBytes: payload.tamanhoBytes,
      tipoArquivo: payload.tipoArquivo ?? 'CSV',
      status: payload.status,
      equipamentoId: payload.equipamentoId ?? null,
      camposEncontrados: payload.camposEncontrados,
      camposNaoEncontrados: payload.camposNaoEncontrados,
      duplicidadesDetectadas: payload.duplicidadesDetectadas,
      erros: payload.erros ?? null,
      dadosBrutos: payload.dadosBrutos ?? null,
      erroMotivo: payload.erroMotivo ?? null,
      ipOrigem: payload.ipOrigem ?? null,
      versaoImportador: payload.versaoImportador ?? CHROMEOS_IMPORTER_VERSION_STR,
      duracaoMs: payload.duracaoMs ?? null,
      qtdCamposEncontrados,
      qtdCamposImportados,
    },
    select: {
      id: true,
      status: true,
      dataHora: true,
      arquivoOriginal: true,
    },
  });
};

const atualizarLogPorId = async (prisma, id, patch) => {
  const data = { ...patch };
  if ('camposStatus' in data) delete data.camposStatus;
  return prisma.importacaoWinAudit.update({
    where: { id },
    data,
    select: { id: true, status: true, equipamentoId: true, erroMotivo: true },
  });
};

const validarInputArquivo = (file) => {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    const erro = new Error('Arquivo não informado ou inválido.');
    erro.statusCode = 400;
    erro.code = 'CHROMEOS_EMPTY_FILE';
    throw erro;
  }
};

const criarCamposStatusInicialChromeOS = (info) => {
  const s = STATUS_CAMPO;
  return {
    nome: info.possuiNome ? s.ENCONTRADO : s.NAO_ENCONTRADO,
    patrimonio: info.possuiPatrimonio ? s.ENCONTRADO : s.NAO_ENCONTRADO,
    usuarioNome: info.possuiUsuarioNome ? s.ENCONTRADO : s.NAO_ENCONTRADO,
    escolaId: info.possuiEscolaId ? s.ENCONTRADO : s.NAO_ENCONTRADO,
    tipo: s.ENCONTRADO,
    status: s.ENCONTRADO,
    modelo: info.possuiModelo ? s.ENCONTRADO : s.NAO_ENCONTRADO,
    serial: info.possuiSerial ? s.ENCONTRADO : s.NAO_ENCONTRADO,
    localizacao: info.possuiLocalizacao ? s.ENCONTRADO : s.NAO_ENCONTRADO,
    macaddress: info.possuiMac ? s.ENCONTRADO : s.NAO_ENCONTRADO,
    observacoes: info.possuiObservacoes ? s.ENCONTRADO : s.NAO_ENCONTRADO,
    fabricante: info.possuiFabricante ? s.ENCONTRADO : s.NAO_ENCONTRADO,
    processador: info.possuiProcessador ? s.ENCONTRADO : s.NAO_ENCONTRADO,
    memoria: info.possuiMemoria ? s.ENCONTRADO : s.NAO_ENCONTRADO,
    dataAquisicao: info.possuiDataAquisicao ? s.ENCONTRADO : s.NAO_ENCONTRADO,
    sourceExternalId: info.possuiSourceExternalId ? s.ENCONTRADO : s.NAO_ENCONTRADO,
    importMetadata: s.ENCONTRADO,
  };
};

const montarCamposEncontradosENao = (camposStatus) => {
  const encontrados = {};
  const naoEncontrados = [];
  const entries = Object.entries(camposStatus || {});
  for (const [campo, valor] of entries) {
    if (valor === STATUS_CAMPO.ENCONTRADO || valor === STATUS_CAMPO.DUPLICIDADE) {
      encontrados[campo] = true;
    } else {
      naoEncontrados.push(campo);
    }
  }
  return { encontrados, naoEncontrados };
};

const carregarEscolasParaUsuario = async (prisma, usuario) => {
  const where = getSchoolScopeWhere(usuario, 'id');
  const rows = await prisma.escola.findMany({
    where,
    select: { id: true, nome: true, sigla: true },
  });
  rows.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return rows;
};

const criarEquipamentoComTransacao = async (prismaRoot, { payload, usuario, logInfo, duracaoInicio }) => {
  const prisma = getPrisma(prismaRoot);
  return prisma.$transaction(async (tx) => {
    const inicio = typeof duracaoInicio === 'number' ? duracaoInicio : Date.now();
    const criado = await EquipamentoService.criarEquipamento({
      payload,
      usuario,
      transactionClient: tx,
    });

    const duracao = Date.now() - inicio;
    if (logInfo?.logId) {
      const patch = {
        status: STATUS_IMPORTACAO_ENUM.SUCESSO,
        equipamentoId: criado.equipamento.id,
        escolaId: criado.equipamento.escolaId ?? logInfo.escolaId ?? null,
        duracaoMs: typeof logInfo.duracaoMs === 'number' ? logInfo.duracaoMs + duracao : duracao,
      };
      await atualizarLogPorId(tx, logInfo.logId, patch);
    }
    return criado;
  });
};

export const gerarPreview = async (input) => {
  const ctx = input || {};
  const { file, usuarioId, escolaId: escolaPadraoIdRaw, prisma: prismaInput, ipOrigem, tipoArquivo, versaoImportador } = ctx;
  const prisma = getPrisma(prismaInput);
  const inicioGeral = Date.now();

  validarInputArquivo(file);
  const versao = typeof versaoImportador === 'string' && versaoImportador ? versaoImportador : CHROMEOS_IMPORTER_VERSION_STR;
  const escolaPadraoId = typeof escolaPadraoIdRaw === 'string' && escolaPadraoIdRaw ? escolaPadraoIdRaw : null;
  const arquivoOriginal = file.originalname || 'chromebook.csv';
  let tamanhoBytes = null;
  if (typeof file.size === 'number') {
    tamanhoBytes = file.size;
  } else if (Buffer.isBuffer(file.buffer)) {
    tamanhoBytes = file.buffer.length;
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, role: true, escolaId: true, escolasAcesso: { select: { escolaId: true } } },
  });
  if (!usuario) {
    const e = new Error('Usuário autenticado não encontrado.');
    e.statusCode = 401;
    e.code = 'CHROMEOS_USER_NOT_FOUND';
    throw e;
  }
  if (escolaPadraoId && !hasSchoolAccess(usuario, escolaPadraoId)) {
    const e = new Error('Usuário não tem acesso à escola padrão selecionada.');
    e.statusCode = 403;
    e.code = 'CHROMEOS_DEFAULT_SCHOOL_FORBIDDEN';
    throw e;
  }

  const escolasDisp = await carregarEscolasParaUsuario(prisma, usuario);
  const parsed = parseChromeOsCsv(file.buffer, arquivoOriginal);
  const camposStatusFalha = criarCamposStatusInicialChromeOS({
    possuiNome: false, possuiPatrimonio: false, possuiUsuarioNome: false,
    possuiEscolaId: !!escolaPadraoId, possuiModelo: false, possuiSerial: false,
    possuiLocalizacao: false, possuiMac: false, possuiObservacoes: false,
    possuiSourceExternalId: false,
    possuiFabricante: false, possuiProcessador: false, possuiMemoria: false, possuiDataAquisicao: false,
  });

  if (!parsed.valido) {
    const info = { ...camposStatusFalha };
    const { encontrados, naoEncontrados } = montarCamposEncontradosENao(info);
    const log = await registrarLog(prisma, {
      usuarioId: usuario.id,
      escolaId: escolaPadraoId,
      arquivoOriginal,
      tamanhoBytes,
      tipoArquivo: tipoArquivo || 'CSV',
      status: STATUS_IMPORTACAO_ENUM.ERRO,
      camposEncontrados: encontrados,
      camposNaoEncontrados: naoEncontrados,
      duplicidadesDetectadas: [],
      erros: [parsed.erro || 'CSV inválido.'],
      erroMotivo: parsed.erro || 'CSV inválido.',
      dadosBrutos: null,
      ipOrigem,
      versaoImportador: versao,
      duracaoMs: Date.now() - inicioGeral,
      camposStatus: info,
    });
    const erro = new Error(parsed.erro || 'CSV inválido.');
    erro.statusCode = 400;
    erro.code = 'CHROMEOS_INVALID_CSV';
    erro.previewId = log.id;
    throw erro;
  }

  const linhasRaw = parsed.linhas || [];
  const previewItens = [];
  const logs = [];

  for (let i = 0; i < linhasRaw.length; i += 1) {
    const inicioItem = Date.now();
    const rawLinha = linhasRaw[i];
    const normalizado = normalizarLinhaChromeOS(rawLinha, i);
    const avisos = [];

    if (!normalizado.valido) {
      const camposStatus = criarCamposStatusInicialChromeOS({
        possuiNome: false, possuiPatrimonio: !!normalizado.annotatedAssetId,
        possuiUsuarioNome: !!normalizado.annotatedUser,
        possuiEscolaId: !!escolaPadraoId, possuiModelo: !!normalizado.model,
        possuiSerial: !!(normalizado.serialNumber || normalizado.deviceId),
        possuiLocalizacao: !!normalizado.annotatedLocation,
        possuiMac: !!(normalizado.macAddress || normalizado.ethernetMacAddress),
        possuiObservacoes: !!normalizado.annotatedNotes,
        possuiSourceExternalId: !!normalizado.deviceId,
        possuiFabricante: false, possuiProcessador: false, possuiMemoria: false, possuiDataAquisicao: false,
      });
      const { encontrados, naoEncontrados } = montarCamposEncontradosENao(camposStatus);
      const log = await registrarLog(prisma, {
        usuarioId: usuario.id,
        escolaId: escolaPadraoId,
        arquivoOriginal,
        tamanhoBytes,
        tipoArquivo: tipoArquivo || 'CSV',
        status: STATUS_IMPORTACAO_ENUM.ERRO,
        camposEncontrados: encontrados,
        camposNaoEncontrados: naoEncontrados,
        duplicidadesDetectadas: [],
        erros: [normalizado.erroMotivo || 'Linha inválida.'],
        erroMotivo: normalizado.erroMotivo || 'Linha inválida.',
        dadosBrutos: { indiceLinha: i, camposOriginais: normalizado.camposOriginais, row: normalizado },
        ipOrigem,
        versaoImportador: versao,
        duracaoMs: Date.now() - inicioItem,
        camposStatus,
      });
      previewItens.push({
        indice: i,
        selecionado: false,
        ignorarDuplicidade: false,
        escolaPendente: false,
        candidatosEscola: [],
        equipamento: null,
        camposStatus,
        duplicidades: [],
        bloqueioSerial: false,
        bloqueioSourceExternalId: false,
        avisos: [normalizado.erroMotivo || 'Linha inválida.'],
        linhaInvalida: true,
        erroMotivo: normalizado.erroMotivo,
        logId: log.id,
      });
      logs.push(log);
      continue;
    }

    const montado = montarEquipamentoNormalizado(normalizado, {
      escolaPadraoId,
      escolasDisponiveis: escolasDisp,
    });
    for (const a of montado.avisos || []) avisos.push(a);

    const escolaFinal = montado.equipamento.escolaId || escolaPadraoId;
    const escolaPendente = montado.escolaPendente || !escolaFinal;
    const candidatosEscola = montado.candidatosEscola || [];

    const dup = await detectarDuplicidades(prisma, {
      serial: montado.equipamento.serial,
      macs: montado.macs || [],
      nome: montado.equipamento.nome,
      sourceExternalId: montado.equipamento.sourceExternalId,
    });

    const camposStatus = criarCamposStatusInicialChromeOS({
      possuiNome: !!montado.equipamento.nome,
      possuiPatrimonio: !!montado.equipamento.patrimonio,
      possuiUsuarioNome: !!montado.equipamento.usuarioNome,
      possuiEscolaId: !!escolaFinal && !escolaPendente,
      possuiModelo: !!montado.equipamento.modelo,
      possuiSerial: !!montado.equipamento.serial,
      possuiLocalizacao: !!montado.equipamento.localizacao,
      possuiMac: !!montado.equipamento.macaddress,
      possuiObservacoes: !!montado.equipamento.observacoes,
      possuiSourceExternalId: !!montado.equipamento.sourceExternalId,
      possuiFabricante: !!montado.equipamento.fabricante,
      possuiProcessador: !!montado.equipamento.processador,
      possuiMemoria: !!montado.equipamento.memoria,
      possuiDataAquisicao: !!montado.equipamento.dataAquisicao,
    });
    if (dup.bloqueioSerial) camposStatus.serial = STATUS_CAMPO.DUPLICIDADE;
    if (dup.bloqueioSourceExternalId) camposStatus.sourceExternalId = STATUS_CAMPO.DUPLICIDADE;
    if (dup.duplicidades.some((d) => d.tipo === 'mac')) camposStatus.macaddress = STATUS_CAMPO.DUPLICIDADE;

    const { encontrados, naoEncontrados } = montarCamposEncontradosENao(camposStatus);
    const temBloqueio = dup.bloqueioSerial || dup.bloqueioSourceExternalId;
    const selecionadoDefault = !temBloqueio && !escolaPendente;
    const duracaoItem = Date.now() - inicioItem;

    const log = await registrarLog(prisma, {
      usuarioId: usuario.id,
      escolaId: escolaFinal || escolaPadraoId,
      arquivoOriginal,
      tamanhoBytes,
      tipoArquivo: tipoArquivo || 'CSV',
      status: STATUS_IMPORTACAO_ENUM.PREVIEW_GERADO,
      camposEncontrados: encontrados,
      camposNaoEncontrados: naoEncontrados,
      duplicidadesDetectadas: dup.duplicidades || [],
      erros: [],
      dadosBrutos: {
        indiceLinha: i,
        row: normalizado,
        equipamento: montado.equipamento,
        escolaPendente,
        candidatosEscola: candidatosEscola.map((e) => ({ id: e.id, nome: e.nome })),
        avisos,
      },
      ipOrigem,
      versaoImportador: versao,
      duracaoMs: duracaoItem,
      camposStatus,
    });
    previewItens.push({
      indice: i,
      selecionado: selecionadoDefault,
      ignorarDuplicidade: false,
      escolaPendente,
      candidatosEscola,
      escolaResolvidaId: escolaFinal || null,
      equipamento: montado.equipamento,
      camposStatus,
      duplicidades: dup.duplicidades || [],
      bloqueioSerial: dup.bloqueioSerial,
      bloqueioSourceExternalId: dup.bloqueioSourceExternalId,
      avisos,
      linhaInvalida: false,
      logId: log.id,
    });
    logs.push(log);
  }

  let previewId = null;
  if (logs.length > 0) {
    previewId = logs[0].id;
    for (let i = 0; i < logs.length; i += 1) {
      const item = previewItens[i];
      const importMetaBruta = item?.equipamento?.importMetadata && typeof item.equipamento.importMetadata === 'object'
        ? item.equipamento.importMetadata
        : null;
      const existingBrutos = await (async () => {
        try {
          const current = await prisma.importacaoWinAudit.findUnique({
            where: { id: logs[i].id },
            select: { dadosBrutos: true },
          });
          return (current?.dadosBrutos && typeof current.dadosBrutos === 'object') ? current.dadosBrutos : null;
        } catch {
          return null;
        }
      })();
      const equipAtualizado = existingBrutos?.equipamento && importMetaBruta
        ? { ...existingBrutos.equipamento, importMetadata: { ...(existingBrutos.equipamento.importMetadata ?? undefined), ...importMetaBruta, previewId } }
        : (existingBrutos?.equipamento || null);
      const dadosAtualizados = {
        ...(existingBrutos ?? undefined),
        previewId,
        ...(equipAtualizado ? { equipamento: equipAtualizado } : undefined),
      };
      if (existingBrutos?.row) {
        dadosAtualizados.row = existingBrutos.row;
      }
      await prisma.importacaoWinAudit.update({
        where: { id: logs[i].id },
        data: { dadosBrutos: dadosAtualizados },
        select: { id: true },
      }).catch(() => { /* ignore */ });
    }
  }

  const totalLinhas = linhasRaw.length;
  const totalValidas = previewItens.filter((l) => !l.linhaInvalida).length;
  const totalEscolasPendentes = previewItens.filter((l) => l.escolaPendente && !l.linhaInvalida).length;
  const totalDuplicidadesBloqueantes = previewItens.filter(
    (l) => !l.linhaInvalida && (l.bloqueioSerial || l.bloqueioSourceExternalId),
  ).length;

  return {
    previewId,
    arquivoOriginal,
    tamanhoBytes,
    linhas: previewItens,
    totalLinhas,
    totalValidas,
    totalEscolasPendentes,
    totalDuplicidadesBloqueantes,
    avisosGerais: [],
    tipoArquivo: tipoArquivo || 'CSV',
    versaoImportador: versao,
    duracaoMs: Date.now() - inicioGeral,
  };
};

const carregarLogsPorPreviewId = async (prisma, previewId) => {
  if (!previewId || typeof previewId !== 'string') return [];

  const peloId = await prisma.importacaoWinAudit.findUnique({
    where: { id: previewId },
    select: {
      id: true,
      dataHora: true,
      usuarioId: true,
      arquivoOriginal: true,
    },
  });

  const filtroDb = {
    OR: [{ id: previewId }],
  };
  if (peloId) {
    const dataInicial = new Date(peloId.dataHora.getTime() - 60_000);
    const dataFinal = new Date(peloId.dataHora.getTime() + 3_600_000);
    filtroDb.OR.push({
      AND: [
        { usuarioId: peloId.usuarioId || undefined },
        { arquivoOriginal: peloId.arquivoOriginal || undefined },
        { dataHora: { gte: dataInicial, lte: dataFinal } },
      ],
    });
  }

  const candidatos = await prisma.importacaoWinAudit.findMany({
    where: filtroDb,
    orderBy: { dataHora: 'asc' },
    select: {
      id: true,
      status: true,
      usuarioId: true,
      escolaId: true,
      equipamentoId: true,
      dadosBrutos: true,
      duplicidadesDetectadas: true,
      erroMotivo: true,
      arquivoOriginal: true,
      tamanhoBytes: true,
      ipOrigem: true,
      versaoImportador: true,
      camposEncontrados: true,
      dataHora: true,
    },
  });

  const rows = candidatos.filter((c) => {
    if (c.id === previewId) return true;
    const bruto = c.dadosBrutos;
    return !!bruto
      && typeof bruto === 'object'
      && (bruto.previewId === previewId);
  });

  if (rows.length === 0) return [];
  const porIdx = [];
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    const bruto = r.dadosBrutos || {};
    const idx = typeof bruto.indiceLinha === 'number' ? bruto.indiceLinha : i;
    porIdx.push({ row: r, idx });
  }
  porIdx.sort((a, b) => a.idx - b.idx);
  return porIdx.map((p) => p.row);
};

const validarPermissaoItem = (usuario, escolaIdResolvido) => {
  if (!usuario) {
    const e = new Error('Usuário ausente.');
    e.statusCode = 401;
    e.code = 'CHROMEOS_USER_MISSING';
    throw e;
  }
  if (!escolaIdResolvido) return true;
  if (!hasSchoolAccess(usuario, escolaIdResolvido)) {
    const e = new Error('Usuário não tem permissão para a escola selecionada.');
    e.statusCode = 403;
    e.code = 'CHROMEOS_SCHOOL_FORBIDDEN';
    throw e;
  }
  return true;
};

const validarContextoConfirmacao = async (prisma, ctx) => {
  const { previewId, itens, usuario } = ctx;
  if (!previewId || typeof previewId !== 'string') {
    const e = new Error('previewId ausente ou inválido.');
    e.statusCode = 400;
    e.code = 'CHROMEOS_MISSING_PREVIEW_ID';
    throw e;
  }
  if (!Array.isArray(itens)) {
    const e = new Error('Itens ausentes ou inválidos.');
    e.statusCode = 400;
    e.code = 'CHROMEOS_MISSING_ITENS';
    throw e;
  }
  const logs = await carregarLogsPorPreviewId(prisma, previewId);
  if (logs.length === 0) {
    const e = new Error('Preview não encontrado.');
    e.statusCode = 404;
    e.code = 'CHROMEOS_PREVIEW_NOT_FOUND';
    throw e;
  }
  if (logs[0].usuarioId !== usuario.id && usuario.role !== 'ADMIN') {
    const e = new Error('Preview pertence a outro usuário.');
    e.statusCode = 403;
    e.code = 'CHROMEOS_PREVIEW_OWNER';
    throw e;
  }
  const itensPorIndice = new Map();
  for (const item of itens) {
    if (!item || typeof item.indiceLinha !== 'number') continue;
    itensPorIndice.set(item.indiceLinha, item);
  }
  return { logs, itensPorIndice };
};

const montarResultadoJaProcessado = (log, indice) => {
  if (log.status === STATUS_IMPORTACAO_ENUM.SUCESSO) {
    return {
      resultado: {
        indiceLinha: indice,
        status: 'SUCESSO',
        equipamentoId: log.equipamentoId || null,
        erroMotivo: null,
        repetido: true,
      },
      deltaSucesso: 1,
      deltaErros: 0,
      deltaCancelados: 0,
    };
  }
  if (log.status === STATUS_IMPORTACAO_ENUM.CANCELADO) {
    return {
      resultado: {
        indiceLinha: indice,
        status: 'CANCELADO',
        equipamentoId: null,
        erroMotivo: null,
        repetido: true,
      },
      deltaSucesso: 0,
      deltaErros: 0,
      deltaCancelados: 1,
    };
  }
  return {
    resultado: {
      indiceLinha: indice,
      status: 'ERRO',
      equipamentoId: null,
      erroMotivo: log.erroMotivo || 'Item já processado com falha.',
    },
    deltaSucesso: 0,
    deltaErros: 1,
    deltaCancelados: 0,
  };
};

const montarResultadoCancelado = async (prisma, log, indice, inicioItem) => {
  await atualizarLogPorId(prisma, log.id, {
    status: STATUS_IMPORTACAO_ENUM.CANCELADO,
    duracaoMs: Date.now() - inicioItem,
  });
  return {
    resultado: {
      indiceLinha: indice,
      status: 'CANCELADO',
      equipamentoId: null,
      erroMotivo: null,
    },
    deltaSucesso: 0,
    deltaErros: 0,
    deltaCancelados: 1,
  };
};

const montarResultadoDadosAusentes = async (prisma, log, indice, inicioItem) => {
  await atualizarLogPorId(prisma, log.id, {
    status: STATUS_IMPORTACAO_ENUM.ERRO,
    erroMotivo: 'Dados do preview ausentes para este item.',
    duracaoMs: Date.now() - inicioItem,
  });
  return {
    resultado: {
      indiceLinha: indice,
      status: 'ERRO',
      equipamentoId: null,
      erroMotivo: 'Dados do preview ausentes.',
    },
    deltaSucesso: 0,
    deltaErros: 1,
    deltaCancelados: 0,
  };
};

const CAMPOS_OVERRIDE_PERMITIDOS_BACKEND = new Set([
  'nome', 'patrimonio', 'usuarioNome', 'escolaId', 'modelo',
  'serial', 'localizacao', 'fabricante', 'processador', 'memoria', 'dataAquisicao',
]);

const LIMITES_OVERRIDE = {
  patrimonio: 191, serial: 191, localizacao: 191,
  fabricante: 191, processador: 191, memoria: 191,
  nome: 255, modelo: 255, usuarioNome: 255,
  observacoes: 2000,
};

const serializarNomeCb = (patrimonio, serial, fallbackNome) => {
  const suffix = patrimonio || serial || null;
  return suffix ? `CB-${suffix}` : (fallbackNome || null);
};

const aplicarOverridesPermitidos = (equipamentoBase, itemSolicitado) => {
  const overridesRaw = itemSolicitado?.overrides && typeof itemSolicitado.overrides === 'object'
    ? itemSolicitado.overrides
    : null;
  const saida = { ...(equipamentoBase ?? undefined) };
  const aplicados = {};
  let houveOverrideSerial = false;
  let houveOverridePatrimonio = false;
  if (!overridesRaw || !equipamentoBase) {
    return { equipamentoAplicado: saida, overridesAplicados: null, houveOverrideSerial, houveOverridePatrimonio };
  }
  for (const rawKey of Object.keys(overridesRaw)) {
    if (!CAMPOS_OVERRIDE_PERMITIDOS_BACKEND.has(rawKey)) continue;
    const val = overridesRaw[rawKey];
    const key = rawKey;
    if (val === null || val === undefined) continue;
    if (typeof val !== 'string') continue;
    if (val.length === 0) continue;
    const limite = LIMITES_OVERRIDE[key];
    if (limite && val.length > limite) {
      const erro = new Error(`Campo ${key} excede o limite de ${limite} caracteres.`);
      erro.code = 'CHROMEOS_OVERRIDE_TAMANHO';
      erro.campo = key;
      throw erro;
    }
    saida[key] = val;
    aplicados[key] = val;
    if (key === 'serial') houveOverrideSerial = true;
    if (key === 'patrimonio') houveOverridePatrimonio = true;
  }
  if (houveOverrideSerial || houveOverridePatrimonio) {
    const nomeNovo = serializarNomeCb(saida.patrimonio, saida.serial, saida.nome);
    if (nomeNovo && nomeNovo !== saida.nome) {
      saida.nome = nomeNovo;
      aplicados.nome = nomeNovo;
    }
  }
  return {
    equipamentoAplicado: saida,
    overridesAplicados: Object.keys(aplicados).length ? aplicados : null,
    houveOverrideSerial,
    houveOverridePatrimonio,
  };
};

const resolverEscolaConfirmacao = (itemSolicitado, equipamentoComOverrides) => {
  if (typeof itemSolicitado.escolaResolvidaId === 'string' && itemSolicitado.escolaResolvidaId) {
    return itemSolicitado.escolaResolvidaId;
  }
  return equipamentoComOverrides.escolaId || null;
};

const montarPayloadConfirmacao = (equipamentoComOverrides, escolaResolvidaId) => {
  const payload = {
    ...equipamentoComOverrides,
    escolaId: escolaResolvidaId || equipamentoComOverrides.escolaId,
    sourceExternalId: equipamentoComOverrides.sourceExternalId,
    importMetadata: equipamentoComOverrides.importMetadata,
  };
  if (!payload.usuarioNome) {
    payload.usuarioNome = 'Chromebook (sem usuário)';
  }
  if (!payload.dataAquisicao) {
    payload.dataAquisicao = new Date().toISOString().slice(0, 10);
  }
  return payload;
};

const avaliarDuplicidadesConfirmacao = async (prisma, equipamentoBase, itemSolicitado, usuario) => {
  const dupResult = await detectarDuplicidades(prisma, {
    serial: equipamentoBase.serial,
    macs: [equipamentoBase.macaddress].filter(Boolean),
    nome: equipamentoBase.nome,
    sourceExternalId: equipamentoBase.sourceExternalId,
  });
  const bloqueio = dupResult.bloqueioSerial || dupResult.bloqueioSourceExternalId;
  let erroMotivo = null;
  if (bloqueio && itemSolicitado.ignorarDuplicidade !== true) {
    erroMotivo = 'Duplicidade detectada (serial ou deviceId já existente). Marque "Ignorar duplicidade" caso seja ADMIN.';
  } else if (bloqueio && itemSolicitado.ignorarDuplicidade === true && usuario.role !== 'ADMIN') {
    erroMotivo = 'Apenas ADMIN pode ignorar duplicidades bloqueantes.';
  }
  return { dupResult, erroMotivo };
};

const montarResultadoErroValidacao = async (prisma, log, indice, inicioItem, erroMotivo, dupResult, logExistenteDuplicidades) => {
  await atualizarLogPorId(prisma, log.id, {
    status: STATUS_IMPORTACAO_ENUM.ERRO,
    erroMotivo,
    duracaoMs: Date.now() - inicioItem,
    duplicidadesDetectadas: (dupResult?.duplicidades || (logExistenteDuplicidades || [])),
  });
  return {
    resultado: {
      indiceLinha: indice,
      status: 'ERRO',
      equipamentoId: null,
      erroMotivo,
      duplicidades: (dupResult?.duplicidades || []),
    },
    deltaSucesso: 0,
    deltaErros: 1,
    deltaCancelados: 0,
  };
};

const montarResultadoSucesso = (criado, indice) => ({
  resultado: {
    indiceLinha: indice,
    status: 'SUCESSO',
    equipamentoId: criado.equipamento.id,
    equipamento: criado.equipamento,
    erroMotivo: null,
  },
  deltaSucesso: 1,
  deltaErros: 0,
  deltaCancelados: 0,
});

const montarResultadoErroGravacao = async (prisma, log, indice, inicioItem, error_) => {
  const motivo = error_?.message || 'Erro ao gravar equipamento.';
  await atualizarLogPorId(prisma, log.id, {
    status: STATUS_IMPORTACAO_ENUM.ERRO,
    erroMotivo: motivo,
    duracaoMs: Date.now() - inicioItem,
    erros: [error_?.code || null, motivo].filter(Boolean),
  });
  return {
    resultado: {
      indiceLinha: indice,
      status: 'ERRO',
      equipamentoId: null,
      erroMotivo: motivo,
    },
    deltaSucesso: 0,
    deltaErros: 1,
    deltaCancelados: 0,
  };
};

const processarUmItemConfirmacao = async (prisma, log, indice, itemSolicitado, usuario) => {
  const inicioItem = Date.now();

  if (log.status !== STATUS_IMPORTACAO_ENUM.PREVIEW_GERADO) {
    return montarResultadoJaProcessado(log, indice);
  }
  if (itemSolicitado?.selecionado !== true) {
    return montarResultadoCancelado(prisma, log, indice, inicioItem);
  }

  const bruto = log.dadosBrutos || {};
  const row = bruto.row || {};
  const equipamentoBase = bruto.equipamento || null;
  if (!row || !equipamentoBase) {
    return montarResultadoDadosAusentes(prisma, log, indice, inicioItem);
  }

  let overrideInfo;
  try {
    overrideInfo = aplicarOverridesPermitidos(equipamentoBase, itemSolicitado);
  } catch (error_) {
    if (error_?.code === 'CHROMEOS_OVERRIDE_TAMANHO') {
      await atualizarLogPorId(prisma, log.id, {
        status: STATUS_IMPORTACAO_ENUM.ERRO,
        erroMotivo: error_.message,
        duracaoMs: Date.now() - inicioItem,
        dadosBrutos: { ...(log.dadosBrutos || undefined), overridesRaw: itemSolicitado?.overrides || null, overridesErro: error_.campo },
      });
      return {
        resultado: { indiceLinha: indice, status: 'ERRO', equipamentoId: null, erroMotivo: error_.message },
        deltaSucesso: 0, deltaErros: 1, deltaCancelados: 0,
      };
    }
    throw error_;
  }
  const { equipamentoAplicado: equipamentoComOverrides, overridesAplicados } = overrideInfo;

  if (overridesAplicados) {
    const brutoAtualizado = { ...(log.dadosBrutos || undefined), overridesAplicados, overridesRaw: itemSolicitado?.overrides || null };
    await atualizarLogPorId(prisma, log.id, { dadosBrutos: brutoAtualizado });
    log.dadosBrutos = brutoAtualizado;
  }

  const escolaResolvidaId = resolverEscolaConfirmacao(itemSolicitado, equipamentoComOverrides);
  let erroMotivo = !escolaResolvidaId ? 'Escola não resolvida para este item.' : null;

  if (!erroMotivo) {
    try {
      validarPermissaoItem(usuario, escolaResolvidaId);
    } catch (error_) {
      erroMotivo = error_.message || 'Permissão negada.';
    }
  }

  let dupResult = null;
  if (!erroMotivo) {
    const dup = await avaliarDuplicidadesConfirmacao(prisma, equipamentoComOverrides, itemSolicitado, usuario);
    dupResult = dup.dupResult;
    erroMotivo = dup.erroMotivo;
  }

  const equipamentoPayload = montarPayloadConfirmacao(equipamentoComOverrides, escolaResolvidaId);

  if (erroMotivo) {
    return montarResultadoErroValidacao(
      prisma, log, indice, inicioItem, erroMotivo, dupResult, log.duplicidadesDetectadas,
    );
  }

  try {
    const criado = await criarEquipamentoComTransacao(prisma, {
      payload: equipamentoPayload,
      usuario,
      logInfo: { logId: log.id, escolaId: escolaResolvidaId, duracaoMs: 0 },
      duracaoInicio: inicioItem,
    });
    return montarResultadoSucesso(criado, indice);
  } catch (error_) {
    return montarResultadoErroGravacao(prisma, log, indice, inicioItem, error_);
  }
};

export const confirmarImportacao = async (input) => {
  const ctx = input || {};
  const { usuario, prisma: prismaInput } = ctx;
  const prisma = getPrisma(prismaInput);
  const inicioGeral = Date.now();

  const { logs, itensPorIndice } = await validarContextoConfirmacao(prisma, ctx);

  const resultados = [];
  let totalSucesso = 0;
  let totalErros = 0;
  let totalCancelados = 0;

  for (let i = 0; i < logs.length; i += 1) {
    const log = logs[i];
    const bruto = log.dadosBrutos || {};
    const indice = typeof bruto.indiceLinha === 'number' ? bruto.indiceLinha : i;
    const itemSolicitado = itensPorIndice.get(indice);

    const processado = await processarUmItemConfirmacao(prisma, log, indice, itemSolicitado, usuario);
    resultados.push(processado.resultado);
    totalSucesso += processado.deltaSucesso;
    totalErros += processado.deltaErros;
    totalCancelados += processado.deltaCancelados;
  }

  return {
    previewId: ctx.previewId,
    resultados,
    totalSucesso,
    totalErros,
    totalCancelados,
    duracaoMs: Date.now() - inicioGeral,
  };
};

export default {
  gerarPreview,
  confirmarImportacao,
};
