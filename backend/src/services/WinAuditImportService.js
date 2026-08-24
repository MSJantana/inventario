import PrismaClientModule from '@prisma/client';
import { parseWinAuditHtml } from '../utils/winaudit/parserHtml.js';
import { extrairCamposDeEstruturaParseada } from '../utils/winaudit/extractFields.js';
import { detectarDuplicidades } from '../utils/winaudit/detectDuplicidades.js';
import EquipamentoService from './EquipamentoService.js';
import {
  normalizarTexto,
  normalizarSerial,
  normalizarNome,
  normalizarUsuarioNome,
  normalizarMacEntrada,
  converterMemoriaParaMB,
  formatarMemoriaParaExibicao,
  salvarMemoriaComoMB,
  classificarTipoInterface,
  montarModeloComposto,
} from '../utils/winaudit/normalizers.js';
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

const PRIORIDADE_MAC_TIPO = ['Ethernet', 'Wi-Fi', 'Outro', 'Bluetooth', 'Virtual'];

const pegarPrimeiroNaoVazio = (lista, limite = 1) => {
  if (!Array.isArray(lista) || lista.length === 0) return [];
  return lista
    .filter((item) => {
      const v = item?.valor ? normalizarTexto(item.valor) : normalizarTexto(item);
      return !!v;
    })
    .slice(0, limite);
};

const normalizarMacs = (entradas) => {
  if (!Array.isArray(entradas) || entradas.length === 0) {
    return { todos: [], principais: [], principal: null, mensagens: [] };
  }

  const unicos = new Map();
  const mensagens = [];

  entradas.forEach((item) => {
    const rawValor = typeof item === 'string' ? item : item?.valor;
    const contexto = typeof item === 'string' ? '' : (item?.contexto || '');
    const res = normalizarMacEntrada(rawValor);
    if (!res.valor) {
      if (rawValor) mensagens.push(`MAC inválido ignorado: "${rawValor}" - ${res.mensagem}`);
      return;
    }
    const tipo = classificarTipoInterface(contexto + ' ' + (typeof item !== 'string' && item?.rawLabel ? item.rawLabel : ''));
    const chave = res.valor;
    if (!unicos.has(chave)) {
      unicos.set(chave, { valor: res.valor, tipo, contexto });
    }
  });

  const todos = Array.from(unicos.values());
  todos.sort((a, b) => PRIORIDADE_MAC_TIPO.indexOf(a.tipo) - PRIORIDADE_MAC_TIPO.indexOf(b.tipo));
  return { todos, principais: todos.slice(0, 6), principal: todos[0] || null, mensagens };
};

const extrairMemoria = (lista) => {
  const itens = pegarPrimeiroNaoVazio(lista, 3);
  if (itens.length === 0) return { mb: null, formatado: '', salvo: '', valido: false, mensagem: 'Não encontrado' };
  for (const candidato of itens) {
    const valor = candidato.valor ?? candidato;
    const parsed = converterMemoriaParaMB(valor);
    if (parsed.valido) {
      return {
        mb: parsed.megabytes,
        formatado: formatarMemoriaParaExibicao(parsed.megabytes),
        salvo: salvarMemoriaComoMB(parsed.megabytes),
        valido: true,
        mensagem: null,
      };
    }
  }
  return { mb: null, formatado: '', salvo: '', valido: false, mensagem: 'Formato inválido' };
};

const DATA_REGEX_VARIANTES = Object.freeze([
  /^(\d{2})[/-](\d{2})[/-](\d{4})$/,
  /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
  /^(\d{4})[/-](\d{2})[/-](\d{2})$/,
]);

const DATA_RESULTADO_INVALIDO = Object.freeze({
  iso: '',
  br: '',
  valido: false,
  mensagem: 'Formato inválido',
});

const DATA_RESULTADO_NAO_ENCONTRADO = Object.freeze({
  iso: '',
  br: '',
  valido: false,
  mensagem: 'Não encontrado',
});

const tentarMatchRegexVariantes = (texto) => {
  for (const re of DATA_REGEX_VARIANTES) {
    const match = texto.match(re);
    if (match) return match;
  }
  return null;
};

const tentarMatchFormatoCompacto = (raw) => {
  const apenasDigitos = raw.replace(/\D/g, '');
  if (apenasDigitos.length !== 8) return null;
  const prefixo = Number(apenasDigitos.slice(0, 2));
  const comecaComAno = prefixo >= 19 && prefixo <= 21;
  if (comecaComAno) {
    return [
      '',
      apenasDigitos.slice(0, 4),
      apenasDigitos.slice(4, 6),
      apenasDigitos.slice(6, 8),
    ];
  }
  const dia = apenasDigitos.slice(0, 2);
  const mes = apenasDigitos.slice(2, 4);
  const ano = apenasDigitos.slice(4, 8);
  const pareceDdMmYyyy = Number(dia) <= 31 && Number(mes) <= 12;
  if (pareceDdMmYyyy) return ['', dia, mes, ano];
  return [
    '',
    apenasDigitos.slice(0, 4),
    apenasDigitos.slice(4, 6),
    apenasDigitos.slice(6, 8),
  ];
};

const obterMatchData = (raw) => {
  const matchDireto = tentarMatchRegexVariantes(raw);
  if (matchDireto) return matchDireto;
  const limpo = raw.replace(/[^0-9/-]/g, '');
  const matchLimpo = tentarMatchRegexVariantes(limpo);
  if (matchLimpo) return matchLimpo;
  return tentarMatchFormatoCompacto(raw);
};

const extrairAnoMesDia = (match) => {
  if (match[1].length === 4) {
    return {
      ano: match[1],
      mes: match[2].padStart(2, '0'),
      dia: match[3].padStart(2, '0'),
    };
  }
  const primeiro = Number(match[1]);
  const segundo = Number(match[2]);
  const diaPrimeiro = primeiro > 12 && segundo <= 12;
  if (diaPrimeiro) {
    return {
      dia: match[1].padStart(2, '0'),
      mes: match[2].padStart(2, '0'),
      ano: match[3],
    };
  }
  return {
    mes: match[1].padStart(2, '0'),
    dia: match[2].padStart(2, '0'),
    ano: match[3],
  };
};

const validarIntervalosData = (ano, mes, dia) => {
  const nAno = Number(ano);
  const nMes = Number(mes);
  const nDia = Number(dia);
  const anoOk = nAno >= 1980 && nAno <= 2100;
  const mesOk = nMes >= 1 && nMes <= 12;
  const diaOk = nDia >= 1 && nDia <= 31;
  return anoOk && mesOk && diaOk;
};

const converterDataWinAudit = (entrada) => {
  const raw = normalizarTexto(entrada);
  if (!raw) return DATA_RESULTADO_NAO_ENCONTRADO;
  const match = obterMatchData(raw);
  if (!match) return DATA_RESULTADO_INVALIDO;
  const { ano, mes, dia } = extrairAnoMesDia(match);
  if (!validarIntervalosData(ano, mes, dia)) {
    return { iso: '', br: '', valido: false, mensagem: 'Valores fora do intervalo' };
  }
  return {
    iso: `${ano}-${mes}-${dia}`,
    br: `${dia}/${mes}/${ano}`,
    valido: true,
    mensagem: null,
  };
};

const STATUS_IMPORTACAO_ENUM = {
  PREVIEW_GERADO: 'PREVIEW_GERADO',
  SUCESSO: 'SUCESSO',
  CANCELADO: 'CANCELADO',
  ERRO: 'ERRO',
};

const registrarLog = async (prisma, payload) => {
  return prisma.importacaoWinAudit.create({
    data: {
      usuarioId: payload.usuarioId,
      escolaId: payload.escolaId ?? null,
      arquivoOriginal: payload.arquivoOriginal,
      tamanhoBytes: payload.tamanhoBytes,
      status: payload.status,
      equipamentoId: payload.equipamentoId ?? null,
      camposEncontrados: payload.camposEncontrados,
      camposNaoEncontrados: payload.camposNaoEncontrados,
      duplicidadesDetectadas: payload.duplicidadesDetectadas,
      erros: payload.erros ?? null,
      dadosBrutos: payload.dadosBrutos ?? null,
    },
    select: {
      id: true,
      status: true,
      dataHora: true,
      arquivoOriginal: true,
    },
  });
};

const validarInputArquivo = (file) => {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    const erro = new Error('Arquivo não informado ou inválido.');
    erro.statusCode = 400;
    erro.code = 'WINAUDIT_EMPTY_FILE';
    throw erro;
  }
};

const criarCamposStatusInicial = (escolaId) => ({
  nome: STATUS_CAMPO.NAO_ENCONTRADO,
  usuarioNome: STATUS_CAMPO.NAO_ENCONTRADO,
  fabricante: STATUS_CAMPO.NAO_ENCONTRADO,
  modelo: STATUS_CAMPO.NAO_ENCONTRADO,
  serial: STATUS_CAMPO.NAO_ENCONTRADO,
  macaddress: STATUS_CAMPO.NAO_ENCONTRADO,
  processador: STATUS_CAMPO.NAO_ENCONTRADO,
  memoria: STATUS_CAMPO.NAO_ENCONTRADO,
  dataAquisicao: STATUS_CAMPO.NAO_ENCONTRADO,
  patrimonio: STATUS_CAMPO.NAO_ENCONTRADO,
  escolaId: escolaId ? STATUS_CAMPO.ENCONTRADO : STATUS_CAMPO.NAO_ENCONTRADO,
});

const lancarErroArquivoInvalido = async (prisma, contexto) => {
  const { parsed, usuarioId, escolaId, file, camposStatusInicial } = contexto;
  const erros = [parsed.erro];
  const log = await registrarLog(prisma, {
    usuarioId,
    escolaId,
    arquivoOriginal: file.originalname || 'arquivo.html',
    tamanhoBytes: file.size || file.buffer?.length || null,
    status: STATUS_IMPORTACAO_ENUM.ERRO,
    camposEncontrados: {},
    camposNaoEncontrados: Object.keys(camposStatusInicial),
    duplicidadesDetectadas: [],
    erros,
    dadosBrutos: null,
  });
  const erro = new Error(parsed.erro || 'Arquivo inválido.');
  erro.statusCode = 400;
  erro.code = 'WINAUDIT_INVALID_REPORT';
  erro.previewId = log.id;
  throw erro;
};

const normalizarProcessadorEntry = (entry) => {
  const valor = typeof entry === 'object' ? entry?.valor : entry;
  return normalizarTexto(valor);
};

const encontrarEntryPorLabelAprox = (entries, tokens) => {
  if (!Array.isArray(entries)) return undefined;
  return entries.find((entry) => {
    const raw = typeof entry?.rawLabel === 'string' ? entry.rawLabel : '';
    const contexto = typeof entry?.contexto === 'string' ? entry.contexto : '';
    const fonte = `${raw} ${contexto}`.toLowerCase();
    return tokens.some((t) => fonte.includes(t));
  });
};

const montarProcessadorConcatenado = (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) return '';
  const description = encontrarEntryPorLabelAprox(entries, ['processor description', 'cpu description', 'processor name', 'processor model']);
  const number = encontrarEntryPorLabelAprox(entries, ['number of processors', 'processors', 'logical processors', 'cores', 'core count']);
  const descricao = normalizarProcessadorEntry(description);
  const numero = normalizarProcessadorEntry(number);
  const partes = [descricao, numero].filter((v) => typeof v === 'string' && v.length > 0);
  if (partes.length === 0) {
    return normalizarProcessadorEntry(entries[0]);
  }
  if (partes.length === 1) {
    return partes[0];
  }
  return `${partes[0]} (${partes[1]})`;
};

const extrairENormalizarCampos = (extraidos) => {
  const nomeRaw = pegarPrimeiroNaoVazio(extraidos.raw.NOME, 1)[0];
  const usuarioNomeRaw = pegarPrimeiroNaoVazio(extraidos.raw.USUARIO_NOME, 1)[0];
  const fabricanteRaw = pegarPrimeiroNaoVazio(extraidos.raw.FABRICANTE, 1)[0];
  const modeloRaw = pegarPrimeiroNaoVazio(extraidos.raw.MODELO_ORIGINAL, 1)[0];
  const serialRaw = pegarPrimeiroNaoVazio(extraidos.raw.SERIAL, 1)[0];
  const macsRaw = extraidos.raw.MAC_ADDRESS || [];
  const memoria = extrairMemoria(extraidos.raw.MEMORIA);
  const dataAquisicaoRaw = pegarPrimeiroNaoVazio(extraidos.raw.DATA_AQUISICAO, 1)[0];
  const dataAquisicaoInfo = converterDataWinAudit(dataAquisicaoRaw?.valor ?? dataAquisicaoRaw);

  const processadorEntries = extraidos.raw.PROCESSADOR || [];
  const processadorRaw = processadorEntries[0];
  const processador = montarProcessadorConcatenado(processadorEntries);

  const nome = normalizarNome(nomeRaw?.valor ?? nomeRaw);
  const usuarioNome = normalizarUsuarioNome(usuarioNomeRaw?.valor ?? usuarioNomeRaw);
  const fabricante = normalizarTexto(fabricanteRaw?.valor ?? fabricanteRaw);
  const modeloCompostoInfo = montarModeloComposto(
    fabricanteRaw?.valor ?? fabricanteRaw,
    modeloRaw?.valor ?? modeloRaw,
  );
  const serial = normalizarSerial(serialRaw?.valor ?? serialRaw);
  const macsInfo = normalizarMacs(macsRaw);

  return {
    nome,
    usuarioNome,
    fabricante,
    modeloCompostoInfo,
    serial,
    processador,
    processadorRaw,
    memoria,
    macsInfo,
    macsRaw,
    dataAquisicaoInfo,
    dataAquisicaoRaw,
  };
};

const coletarAvisosExtracao = (extraidos, serial, macsInfo, rawMemoria) => {
  const avisos = [];
  for (const m of macsInfo.mensagens) avisos.push(m);
  if (serial && serial.length < 3) {
    avisos.push('Número de série encontrado parece ser curto.');
  }
  if (extraidos.labelsMatchCount < 2) {
    avisos.push('Poucos campos foram localizados no relatório. Verifique se o arquivo foi gerado corretamente.');
  }
  if (!macsInfo.principal?.valor && (extraidos.raw.MAC_ADDRESS || []).length > 0) {
    avisos.push('Endereços MAC localizados, mas nenhum em formato válido.');
  }
  if (rawMemoria.some((e) => e?.valor)) {
    avisos.push('Memória localizada no relatório, mas em formato inválido.');
  }
  return avisos;
};

const aplicarStatusCamposPorConteudo = (camposStatus, campos, rawMemoria, rawDataAquisicao) => {
  const { nome, usuarioNome, fabricante, modeloCompostoInfo, serial, processador, processadorRaw, memoria, macsInfo, macsRaw, dataAquisicaoInfo } = campos;
  if (nome) camposStatus.nome = STATUS_CAMPO.ENCONTRADO;
  if (usuarioNome) camposStatus.usuarioNome = STATUS_CAMPO.ENCONTRADO;
  if (fabricante) camposStatus.fabricante = STATUS_CAMPO.ENCONTRADO;
  if (modeloCompostoInfo.modeloComposto) camposStatus.modelo = STATUS_CAMPO.ENCONTRADO;
  if (serial) camposStatus.serial = STATUS_CAMPO.ENCONTRADO;
  if (processador || processadorRaw) camposStatus.processador = STATUS_CAMPO.ENCONTRADO;
  if (memoria.valido) {
    camposStatus.memoria = STATUS_CAMPO.ENCONTRADO;
  } else if (rawMemoria.some((e) => e?.valor)) {
    camposStatus.memoria = STATUS_CAMPO.INVALIDO;
  }
  if (macsInfo.principal?.valor) {
    camposStatus.macaddress = STATUS_CAMPO.ENCONTRADO;
  } else if (macsRaw.length > 0) {
    camposStatus.macaddress = STATUS_CAMPO.INVALIDO;
  }
  if (dataAquisicaoInfo?.valido && dataAquisicaoInfo?.iso) {
    camposStatus.dataAquisicao = STATUS_CAMPO.ENCONTRADO;
  } else if (rawDataAquisicao?.length > 0 && rawDataAquisicao.some((e) => e?.valor)) {
    camposStatus.dataAquisicao = STATUS_CAMPO.INVALIDO;
  }
};

const aplicarStatusCamposPorDuplicidades = (camposStatus, duplicidades) => {
  if (!duplicidades.possivelDuplicidade) return;
  for (const dup of duplicidades.duplicidades) {
    if (dup.tipo === 'serial' && duplicidades.serial) camposStatus.serial = STATUS_CAMPO.DUPLICIDADE;
    if (dup.tipo === 'mac') camposStatus.macaddress = STATUS_CAMPO.DUPLICIDADE;
    if (dup.tipo === 'nome' && camposStatus.nome !== STATUS_CAMPO.DUPLICIDADE) {
      camposStatus.nome = STATUS_CAMPO.DUPLICIDADE;
    }
  }
};

const extrairLabelTratado = (hit) => {
  if (typeof hit?.rawLabel === 'string' && hit.rawLabel.trim()) {
    return hit.rawLabel.trim();
  }
  if (typeof hit?.contexto === 'string' && hit.contexto.trim()) {
    return hit.contexto.trim();
  }
  return null;
};

const pegarLabelRawDoCampo = (entries, fallbackTokens, fallbackLabel) => {
  if (Array.isArray(entries) && entries.length > 0) {
    const hit = entries.find((entry) => {
      const raw = typeof entry?.rawLabel === 'string' ? entry.rawLabel : '';
      const contexto = typeof entry?.contexto === 'string' ? entry.contexto : '';
      const fonte = `${raw} ${contexto}`.toLowerCase();
      return fallbackTokens.some((t) => fonte.includes(t));
    }) || entries[0];
    const label = extrairLabelTratado(hit);
    if (label) return label;
  }
  return fallbackLabel;
};

const pegarValorDisplayDoCampo = (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) return '';
  const entry = entries[0];
  const valor = typeof entry === 'object' ? entry?.valor : entry;
  if (valor === null || valor === undefined) return '';
  return typeof valor === 'string' ? valor : String(valor);
};

const MONTAR_MAPEAMENTOS_WIZARD = (extraidos, dados, camposStatus) => {
  const raw = extraidos.raw || {};
  const mapeamentos = [];

  const labelNome = pegarLabelRawDoCampo(raw.NOME, ['computer name', 'system name', 'hostname', 'pc name', 'nome'], 'Computer Name');
  mapeamentos.push({
    campoRelatorio: labelNome,
    campoCadastro: 'Nome',
    valorEncontrado: dados.nome || pegarValorDisplayDoCampo(raw.NOME),
    status: camposStatus.nome,
  });

  const labelUsuario = pegarLabelRawDoCampo(raw.USUARIO_NOME, ['user account', 'username', 'user name', 'login', 'owner'], 'User Account');
  mapeamentos.push({
    campoRelatorio: labelUsuario,
    campoCadastro: 'Nome do usuário',
    valorEncontrado: dados.usuarioNome || pegarValorDisplayDoCampo(raw.USUARIO_NOME),
    status: camposStatus.usuarioNome,
  });

  const labelFabricanteModelo = (() => {
    const fabricanteLabel = pegarLabelRawDoCampo(raw.FABRICANTE, ['manufacturer', 'make', 'vendor', 'fabricante'], 'Manufacturer');
    const modeloLabel = pegarLabelRawDoCampo(raw.MODELO_ORIGINAL, ['model', 'system model', 'product', 'model number'], 'Model');
    if (fabricanteLabel === modeloLabel) return fabricanteLabel;
    return `${fabricanteLabel} + ${modeloLabel}`;
  })();
  mapeamentos.push({
    campoRelatorio: labelFabricanteModelo,
    campoCadastro: 'Modelo',
    valorEncontrado: dados.modelo || [pegarValorDisplayDoCampo(raw.FABRICANTE), pegarValorDisplayDoCampo(raw.MODELO_ORIGINAL)].filter(Boolean).join(' ').trim(),
    status: camposStatus.modelo,
  });

  const labelSerial = pegarLabelRawDoCampo(raw.SERIAL, ['serial number', 'serial', 'service tag', 'asset tag', 's/n'], 'Serial Number');
  mapeamentos.push({
    campoRelatorio: labelSerial,
    campoCadastro: 'Serial',
    valorEncontrado: dados.serial || pegarValorDisplayDoCampo(raw.SERIAL),
    status: camposStatus.serial,
  });

  const labelMac = pegarLabelRawDoCampo(raw.MAC_ADDRESS, ['mac address', 'mac', 'physical address', 'endereço mac'], 'Mac Address');
  mapeamentos.push({
    campoRelatorio: labelMac,
    campoCadastro: 'MAC Address',
    valorEncontrado: dados.macPrincipal || pegarValorDisplayDoCampo(raw.MAC_ADDRESS),
    status: camposStatus.macaddress,
  });

  const labelFabricante = pegarLabelRawDoCampo(raw.FABRICANTE, ['manufacturer', 'make', 'vendor', 'fabricante'], 'Manufacturer');
  mapeamentos.push({
    campoRelatorio: labelFabricante,
    campoCadastro: 'Fabricante',
    valorEncontrado: dados.fabricante || pegarValorDisplayDoCampo(raw.FABRICANTE),
    status: camposStatus.fabricante,
  });

  const labelProcessador = pegarLabelRawDoCampo(raw.PROCESSADOR, ['processor description', 'cpu', 'processor', 'processador'], 'Processor Description');
  const displayProcessador = (() => {
    if (dados.processador) return dados.processador;
    if (Array.isArray(raw.PROCESSADOR) && raw.PROCESSADOR.length > 1) {
      const tokensDesc = ['processor description', 'cpu description', 'processor name', 'processor model'];
      const hitDesc = raw.PROCESSADOR.find((entry) => {
        const fonte = `${typeof entry?.rawLabel === 'string' ? entry.rawLabel : ''} ${typeof entry?.contexto === 'string' ? entry.contexto : ''}`.toLowerCase();
        return tokensDesc.some((t) => fonte.includes(t));
      });
      if (hitDesc) {
        const descricao = typeof hitDesc.valor === 'string' ? hitDesc.valor : '';
        if (descricao) return descricao;
      }
    }
    return pegarValorDisplayDoCampo(raw.PROCESSADOR);
  })();
  mapeamentos.push({
    campoRelatorio: labelProcessador,
    campoCadastro: 'Processador',
    valorEncontrado: displayProcessador,
    status: camposStatus.processador,
  });

  const labelMemoria = pegarLabelRawDoCampo(raw.MEMORIA, ['total memory', 'total physical memory', 'ram', 'memória', 'memory'], 'Total Memory');
  mapeamentos.push({
    campoRelatorio: labelMemoria,
    campoCadastro: 'Memória',
    valorEncontrado: (dados.memoriaFormatada || dados.memoria || pegarValorDisplayDoCampo(raw.MEMORIA)),
    status: camposStatus.memoria,
  });

  const labelData = pegarLabelRawDoCampo(raw.DATA_AQUISICAO, ['release date', 'install date', 'installation date', 'data de fabricação', 'data de instalação'], 'Release Date');
  const displayData = dados.dataAquisicaoFormatada || dados.dataAquisicao || pegarValorDisplayDoCampo(raw.DATA_AQUISICAO);
  if (displayData) {
    mapeamentos.push({
      campoRelatorio: labelData,
      campoCadastro: 'Data de Aquisição',
      valorEncontrado: displayData,
      status: camposStatus.dataAquisicao,
    });
  }

  return mapeamentos.filter((m) => typeof m.valorEncontrado === 'string' && m.valorEncontrado.length > 0);
};

const montarMapasCampos = (camposStatus) => {
  const camposEncontradosMap = {};
  Object.entries(camposStatus).forEach(([k, v]) => {
    camposEncontradosMap[k] = v === STATUS_CAMPO.ENCONTRADO || v === STATUS_CAMPO.DUPLICIDADE;
  });
  const camposNaoEncontradosLista = Object.keys(camposStatus).filter(
    (k) => camposStatus[k] === STATUS_CAMPO.NAO_ENCONTRADO || camposStatus[k] === STATUS_CAMPO.INVALIDO,
  );
  return { camposEncontradosMap, camposNaoEncontradosLista };
};

const montarDadosBrutos = (extraidos) => ({
  camposBrutosExtraidos: {
    NOME: extraidos.raw.NOME,
    USUARIO_NOME: extraidos.raw.USUARIO_NOME,
    FABRICANTE: extraidos.raw.FABRICANTE,
    MODELO_ORIGINAL: extraidos.raw.MODELO_ORIGINAL,
    SERIAL: extraidos.raw.SERIAL,
    PROCESSADOR: extraidos.raw.PROCESSADOR,
    MEMORIA: extraidos.raw.MEMORIA,
    MAC_ADDRESS: extraidos.raw.MAC_ADDRESS,
    DATA_AQUISICAO: extraidos.raw.DATA_AQUISICAO,
  },
  secoesEncontradas: Array.from(extraidos.secoesEncontradas),
  labelsMatchCount: extraidos.labelsMatchCount,
});

const montarDadosEquipamento = (camposNormalizados, escolaId, memoria) => {
  const { nome, usuarioNome, fabricante, modeloCompostoInfo, serial, processador, macsInfo, dataAquisicaoInfo } = camposNormalizados;
  const resultadoMacs = macsInfo.todos.length > 0 ? macsInfo : {
    todos: macsInfo.todos,
    principais: macsInfo.principais,
    principal: macsInfo.principal,
    mensagens: macsInfo.mensagens,
  };
  return {
    nome,
    usuarioNome,
    fabricante: modeloCompostoInfo.fabricante,
    modeloOriginal: modeloCompostoInfo.modeloOriginal,
    modelo: modeloCompostoInfo.modeloComposto,
    serial,
    macs: resultadoMacs.todos,
    macPrincipal: resultadoMacs.principal?.valor || '',
    processador,
    memoria: memoria.salvo,
    memoriaFormatada: memoria.formatado,
    memoriaMB: memoria.mb,
    dataAquisicao: dataAquisicaoInfo?.iso || '',
    dataAquisicaoFormatada: dataAquisicaoInfo?.br || '',
    tipoSugerido: sugerirTipo(fabricante, modeloCompostoInfo.modeloComposto, processador),
    escolaId: escolaId || '',
  };
};

const montarRespostaPreview = ({ log, dados, camposStatus, camposNaoEncontrados, avisos, duplicidades, extraidos, file }) => {
  const mapeamentosWizard = MONTAR_MAPEAMENTOS_WIZARD(extraidos, dados, camposStatus);
  return {
    previewId: log.id,
    dados,
    camposStatus,
    camposNaoEncontrados,
    avisos,
    duplicidades: duplicidades.duplicidades,
    possivelDuplicidade: duplicidades.possivelDuplicidade,
    bloqueioSerial: duplicidades.bloqueioSerial,
    metadados: {
      labelsMatchCount: extraidos.labelsMatchCount,
      tamanhoBytes: file.size || file.buffer?.length || null,
      arquivoOriginal: file.originalname || 'arquivo.html',
      mapeamentosWizard,
    },
  };
};

export const gerarPreview = async (input) => {
  const { file, usuarioId, escolaId, prisma: prismaInput } = input || {};
  validarInputArquivo(file);

  const prisma = getPrisma(prismaInput);
  const camposStatus = criarCamposStatusInicial(escolaId);

  const parsed = parseWinAuditHtml(file.buffer, file.originalname || '');
  if (!parsed.valido) {
    await lancarErroArquivoInvalido(prisma, { parsed, usuarioId, escolaId, file, camposStatusInicial: camposStatus });
  }

  const extraidos = extrairCamposDeEstruturaParseada(parsed);
  const campos = extrairENormalizarCampos(extraidos);

  const rawMemoriaParaAviso = campos.memoria.valido ? [] : extraidos.raw.MEMORIA;
  const avisosExtracao = coletarAvisosExtracao(extraidos, campos.serial, campos.macsInfo, rawMemoriaParaAviso);

  aplicarStatusCamposPorConteudo(camposStatus, campos, extraidos.raw.MEMORIA, extraidos.raw.DATA_AQUISICAO);

  const duplicidades = await detectarDuplicidades(prisma, {
    serial: campos.serial,
    macs: campos.macsInfo.todos,
    nome: campos.nome,
  });

  aplicarStatusCamposPorDuplicidades(camposStatus, { ...duplicidades, serial: campos.serial });

  const { camposEncontradosMap, camposNaoEncontradosLista } = montarMapasCampos(camposStatus);
  const dadosBrutos = montarDadosBrutos(extraidos);

  const log = await registrarLog(prisma, {
    usuarioId,
    escolaId,
    arquivoOriginal: file.originalname || 'arquivo.html',
    tamanhoBytes: file.size || file.buffer?.length || null,
    status: STATUS_IMPORTACAO_ENUM.PREVIEW_GERADO,
    camposEncontrados: camposEncontradosMap,
    camposNaoEncontrados: camposNaoEncontradosLista,
    duplicidadesDetectadas: duplicidades.duplicidades,
    erros: null,
    dadosBrutos,
  });

  const dados = montarDadosEquipamento(campos, escolaId, campos.memoria);

  return montarRespostaPreview({
    log,
    dados,
    camposStatus,
    camposNaoEncontrados: camposNaoEncontradosLista,
    avisos: avisosExtracao,
    duplicidades,
    extraidos,
    file,
  });
};

const sugerirTipo = (fabricante, modelo, processador) => {
  const texto = `${fabricante || ''} ${modelo || ''} ${processador || ''}`.toUpperCase();
  if (!texto.trim()) return 'DESKTOP';
  if (/(NOTEBOOK|LAPTOP|THINKPAD|IDEAPAD|INSPIRON|ELITEBOOK|PROBOOK|SPECTRE|XPS|MACBOOK|CHROMEBOOK|MOBILE|YOGA|LAVIE|VAIO)/.test(texto)) return 'NOTEBOOK';
  if (/(TABLET|IPAD|TAB)/.test(texto)) return 'TABLET';
  if (/(ALL.IN.ONE|AIO|ALL IN ONE)/.test(texto)) return 'ALL_IN_ONE';
  if (/(SERVER|XEON|POWEREDGE|PROLIANT)/.test(texto)) return 'SERVIDOR';
  if (/(ROUTER|SWITCH|ACCESS POINT|ACCESS-POINT|FIREWALL|PONTO|UNIFI)/.test(texto)) return 'REDE';
  if (/(IMPRESSORA|PRINTER|MULTIFUNCIONAL|MFP|LASERJET|DESKJET)/.test(texto)) return 'IMPRESSORA';
  return 'DESKTOP';
};

const validarPreviewExistente = async (prisma, previewId, usuario) => {
  const log = await prisma.importacaoWinAudit.findUnique({
    where: { id: previewId },
    select: {
      id: true,
      usuarioId: true,
      escolaId: true,
      status: true,
      equipamentoId: true,
      arquivoOriginal: true,
      tamanhoBytes: true,
      camposEncontrados: true,
      camposNaoEncontrados: true,
      duplicidadesDetectadas: true,
      erros: true,
      dadosBrutos: true,
      dataHora: true,
      usuario: { select: { id: true, role: true, escolaId: true } },
    },
  });

  if (!log) {
    const e = new Error('Pré-visualização não encontrada ou expirada.');
    e.statusCode = 404;
    e.code = 'WINAUDIT_PREVIEW_NOT_FOUND';
    throw e;
  }

  if (log.status !== STATUS_IMPORTACAO_ENUM.PREVIEW_GERADO) {
    const e = new Error(`Esta importação já foi processada (status atual: ${log.status}).`);
    e.statusCode = 409;
    e.code = 'WINAUDIT_PREVIEW_ALREADY_PROCESSED';
    throw e;
  }

  if (log.usuarioId !== usuario.id && usuario.role !== 'ADMIN') {
    const e = new Error('Esta pré-visualização pertence a outro usuário.');
    e.statusCode = 403;
    e.code = 'WINAUDIT_PREVIEW_OWNER';
    throw e;
  }

  if (log.escolaId && !hasSchoolAccess(usuario, log.escolaId)) {
    const e = new Error('Usuário não tem acesso à escola desta importação.');
    e.statusCode = 403;
    e.code = 'WINAUDIT_PREVIEW_ESCOLA';
    throw e;
  }

  return log;
};

const validarConfirmacaoInput = (previewId) => {
  if (!previewId) {
    const e = new Error('Identificador da pré-visualização não informado.');
    e.statusCode = 400;
    e.code = 'WINAUDIT_PREVIEW_ID_MISSING';
    throw e;
  }
};

const montarPayloadEquipamentoConfirmacao = (contexto) => {
  const { equipamento, macSelecionado, log, usuario } = contexto;
  const payload = equipamento && typeof equipamento === 'object' ? { ...equipamento } : {};
  if (macSelecionado) {
    const macRes = normalizarMacEntrada(macSelecionado);
    if (!macRes.valido) {
      const e = new Error(macRes.mensagem || 'MAC selecionado é inválido.');
      e.statusCode = 400;
      e.code = 'WINAUDIT_MAC_SELECIONADO_INVALIDO';
      throw e;
    }
    payload.macaddress = macRes.valor;
  }
  if (log.escolaId && !payload.escolaId) payload.escolaId = log.escolaId;
  if (!payload.escolaId && usuario?.escolaId) payload.escolaId = usuario.escolaId;
  if (!payload.status) payload.status = 'EM_USO';
  if (!payload.tipo) payload.tipo = 'DESKTOP';
  if (!payload.dataAquisicao) payload.dataAquisicao = new Date().toISOString().slice(0, 10);
  return payload;
};

const ignorarDuplicidadeHabilitado = (ignorarDuplicidade) =>
  ignorarDuplicidade === true || ignorarDuplicidade === 'true' || ignorarDuplicidade === '1';

const validarBloqueioSerialConfirmacao = (contexto) => {
  const { revalidaDuplicidades, usuario, ignorarDuplicidade } = contexto;
  const bloqueioSerialAtivo = revalidaDuplicidades.duplicidades.some(
    (d) => d.tipo === 'serial' && d.bloqueio,
  );
  if (!bloqueioSerialAtivo) return { bloqueioSerialAtivo: false };
  if (usuario?.role !== 'ADMIN') {
    const e = new Error(
      'Foi encontrado um equipamento ativo com o mesmo número de série. Contate um administrador.',
    );
    e.statusCode = 409;
    e.code = 'WINAUDIT_SERIAL_BLOQUEADO';
    e.duplicidades = revalidaDuplicidades.duplicidades;
    throw e;
  }
  if (!ignorarDuplicidadeHabilitado(ignorarDuplicidade)) {
    const e = new Error(
      'Possível duplicidade de número de série. Confirme explicitamente para continuar.',
    );
    e.statusCode = 409;
    e.code = 'WINAUDIT_SERIAL_REQUIRE_CONFIRM';
    e.duplicidades = revalidaDuplicidades.duplicidades;
    throw e;
  }
  return { bloqueioSerialAtivo: true };
};

const criarEquipamentoComTransacao = async (contexto) => {
  const { prisma, payload, usuario, logId, revalidaDuplicidades } = contexto;
  return prisma.$transaction(async (tx) => {
    const criado = await EquipamentoService.criarEquipamento({
      payload,
      usuario,
      transactionClient: tx,
    });
    const atualizado = await tx.importacaoWinAudit.update({
      where: { id: logId },
      data: {
        status: STATUS_IMPORTACAO_ENUM.SUCESSO,
        equipamentoId: criado.equipamento.id,
        escolaId: criado.escolaId || null,
        duplicidadesDetectadas: revalidaDuplicidades.duplicidades,
      },
      select: {
        id: true,
        status: true,
        dataHora: true,
        equipamentoId: true,
      },
    });
    return { criado, atualizado };
  });
};

const tratarErroCriacaoEquipamento = async (contexto) => {
  const { prisma, logId, errosAcumulados, error } = contexto;
  const erros = [...(errosAcumulados || []), error?.message || 'Erro ao criar equipamento.'];
  try {
    await prisma.importacaoWinAudit.update({
      where: { id: logId },
      data: {
        status: STATUS_IMPORTACAO_ENUM.ERRO,
        erros,
      },
    });
  } catch {
    /* ignora erro secundário */
  }
  if (error?.statusCode) throw error;
  const e = new Error(error?.message || 'Erro ao confirmar importação.');
  e.statusCode = 500;
  e.code = 'WINAUDIT_CONFIRMAR_ERROR';
  throw e;
};

const montarRespostaConfirmacao = (contexto) => {
  const { log, statusCriacao, equipamento, escolaId, duplicidades, bloqueioSerialSuperado, erros } = contexto;
  return {
    previewId: log.id,
    status: statusCriacao,
    equipamento,
    escolaId,
    duplicidades: duplicidades.duplicidades,
    possivelDuplicidade: duplicidades.possivelDuplicidade,
    bloqueioSerialSuperado,
    erros: erros.length > 0 ? erros : null,
  };
};

export const confirmarImportacao = async (input) => {
  const { previewId, usuario, equipamento, macSelecionado, ignorarDuplicidade, prisma: prismaInput } = input || {};
  validarConfirmacaoInput(previewId);

  const prisma = getPrisma(prismaInput);
  const log = await validarPreviewExistente(prisma, previewId, usuario);
  const payloadEquipamento = montarPayloadEquipamentoConfirmacao({ equipamento, macSelecionado, log, usuario });

  const revalidaDuplicidades = await detectarDuplicidades(prisma, {
    serial: payloadEquipamento.serial,
    macs: [payloadEquipamento.macaddress],
    nome: payloadEquipamento.nome,
  });

  const { bloqueioSerialAtivo } = validarBloqueioSerialConfirmacao({
    revalidaDuplicidades,
    usuario,
    ignorarDuplicidade,
  });

  let equipamentoCriado = null;
  let escolaIdCriacao = log.escolaId;
  const erros = log.erros ? [...log.erros] : [];
  let statusCriacao = STATUS_IMPORTACAO_ENUM.SUCESSO;

  try {
    const resultado = await criarEquipamentoComTransacao({
      prisma,
      payload: payloadEquipamento,
      usuario,
      logId: log.id,
      revalidaDuplicidades,
    });
    equipamentoCriado = resultado.criado.equipamento;
    escolaIdCriacao = resultado.criado.escolaId;
  } catch (error) {
    statusCriacao = STATUS_IMPORTACAO_ENUM.ERRO;
    await tratarErroCriacaoEquipamento({ prisma, logId: log.id, errosAcumulados: erros, error });
  }

  const bloqueioSerialSuperado = bloqueioSerialAtivo && ignorarDuplicidade === true;

  return montarRespostaConfirmacao({
    log,
    statusCriacao,
    equipamento: equipamentoCriado,
    escolaId: escolaIdCriacao,
    duplicidades: revalidaDuplicidades,
    bloqueioSerialSuperado,
    erros,
  });
};

const PAGE_SIZE_MAX = 200;
const PAGE_SIZE_DEFAULT = 25;

export const listarLogs = async (input) => {
  const { usuario, pagina, porPagina, filtros, prisma: prismaInput } = input || {};
  const prisma = getPrisma(prismaInput);

  const page = Math.max(1, Number.parseInt(pagina, 10) || 1);
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, Number.parseInt(porPagina, 10) || PAGE_SIZE_DEFAULT),
  );
  const skip = (page - 1) * pageSize;

  const where = {};
  const scopeWhere = getSchoolScopeWhere(usuario, 'escolaId');
  Object.assign(where, scopeWhere);

  if (usuario?.role !== 'ADMIN') {
    where.OR = [{ usuarioId: usuario.id }, ...(where.escolaId ? [{ escolaId: where.escolaId }] : [])];
    delete where.escolaId;
  }

  if (filtros?.status) where.status = filtros.status;
  if (filtros?.arquivoOriginalContem) {
    where.arquivoOriginal = { contains: filtros.arquivoOriginalContem };
  }
  if (filtros?.usuarioId) {
    if (usuario?.role === 'ADMIN') where.usuarioId = filtros.usuarioId;
  }
  if (filtros?.equipamentoId) where.equipamentoId = filtros.equipamentoId;

  const [total, itens] = await Promise.all([
    prisma.importacaoWinAudit.count({ where }),
    prisma.importacaoWinAudit.findMany({
      where,
      take: pageSize,
      skip,
      orderBy: [{ dataHora: 'desc' }],
      select: {
        id: true,
        status: true,
        arquivoOriginal: true,
        tamanhoBytes: true,
        dataHora: true,
        equipamentoId: true,
        escolaId: true,
        camposEncontrados: true,
        camposNaoEncontrados: true,
        usuarioId: true,
        usuario: { select: { id: true, nome: true, email: true, role: true } },
        escola: { select: { id: true, nome: true, sigla: true } },
        equipamento: { select: { id: true, nome: true, patrimonio: true, status: true, modelo: true } },
      },
    }),
  ]);

  return {
    pagina: page,
    porPagina: pageSize,
    total,
    totalPaginas: Math.ceil(total / pageSize) || 1,
    itens,
  };
};

export const obterLogPorId = async (input) => {
  const { id, usuario, prisma: prismaInput } = input || {};
  const prisma = getPrisma(prismaInput);

  const log = await prisma.importacaoWinAudit.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      arquivoOriginal: true,
      tamanhoBytes: true,
      dataHora: true,
      equipamentoId: true,
      escolaId: true,
      camposEncontrados: true,
      camposNaoEncontrados: true,
      duplicidadesDetectadas: true,
      erros: true,
      dadosBrutos: true,
      usuarioId: true,
      usuario: { select: { id: true, nome: true, email: true, role: true } },
      escola: { select: { id: true, nome: true, sigla: true } },
      equipamento: { select: { id: true, nome: true, patrimonio: true, status: true, modelo: true, serial: true, macaddress: true } },
    },
  });

  if (!log) {
    const e = new Error('Importação não encontrada.');
    e.statusCode = 404;
    e.code = 'WINAUDIT_LOG_NOT_FOUND';
    throw e;
  }

  if (log.usuarioId !== usuario?.id && usuario?.role !== 'ADMIN') {
    if (log.escolaId && !hasSchoolAccess(usuario, log.escolaId)) {
      const e = new Error('Acesso negado a esta importação.');
      e.statusCode = 403;
      e.code = 'WINAUDIT_LOG_FORBIDDEN';
      throw e;
    }
  }

  return log;
};

export const WinAuditImportService = {
  gerarPreview,
  confirmarImportacao,
  listarLogs,
  obterLogPorId,
  STATUS_CAMPO,
  STATUS_IMPORTACAO_ENUM,
  PRIORIDADE_MAC_TIPO,
};

export default WinAuditImportService;
