import { normalizarTexto } from './normalizers.js';

const LABEL_SYNONYMS = {
  NOME: [
    'computer name',
    'computer name:',
    'computername',
    'computer',
    'pc name',
    'nome do computador',
    'nome computador',
    'hostname',
    'host name',
  ],
  USUARIO_NOME: [
    'user account',
    'user account:',
    'user name',
    'username',
    'logged on user',
    'logon user',
    'nome do usuario',
    'usuario logado',
    'current user',
  ],
  FABRICANTE: [
    'manufacturer',
    'system manufacturer',
    'computer manufacturer',
    'fabricante',
    'make',
  ],
  MODELO_ORIGINAL: [
    'model',
    'system model',
    'system product',
    'product name',
    'modelo',
    'system product name',
    'product name / model number',
    'model number',
    'version',
  ],
  SERIAL: [
    'serial number',
    'serial number:',
    'serial',
    'serialno',
    'service tag',
    'asset tag',
    'numero de serie',
    'serial do sistema',
    'system serial number',
    'product id',
    'chassis serial number',
    'baseboard serial number',
    'motherboard serial number',
    'serial number (system manufacturer',
  ],
  MAC_ADDRESS: [
    'mac address',
    'mac',
    'mac:',
    'endereco mac',
    'endereco fisico',
    'physical address',
    'ethernet adapter',
    'ethernet adapter physical address',
    'dhcp mac',
  ],
  PROCESSADOR: [
    'processor description',
    'processor',
    'cpu',
    'processador',
    'cpu description',
    'processor name',
    'processor: intel',
    'processor: amd',
    'processor manufacturer',
    'number of processors',
    'processors',
    'cpu cores',
    'number of cores',
    'number of logical processors',
    'core count',
  ],
  MEMORIA: [
    'total memory',
    'total physical memory',
    'ram',
    'memoria',
    'ram memory',
    'memory total',
    'total system memory',
    'total ram',
    'physical memory installed',
  ],
  DATA_AQUISICAO: [
    'release date',
    'release date:',
    'install date',
    'install date:',
    'installation date',
    'date of release',
    'system install date',
    'os install date',
    'data de fabricacao',
    'data de instalacao',
    'data release',
    'aquisicao',
    'date acquired',
    'acquired date',
    'purchase date',
  ],
};

const normalizarLabel = (label) => {
  return normalizarTexto(label).toLowerCase().replace(/[:：]/g, ' ').replace(/\s{2,}/g, ' ').trim();
};

const STATIC_LABELS_PREPARADOS = (() => {
  const mapa = new Map();
  Object.entries(LABEL_SYNONYMS).forEach(([chave, sinonimos]) => {
    sinonimos.forEach((sin) => {
      const norm = normalizarLabel(sin);
      if (!mapa.has(norm)) mapa.set(norm, chave);
    });
  });
  return mapa;
})();

const prioridadeSerial = (labelNormalizada) => {
  const p = [
    'system serial number',
    'serial number',
    'serial',
    'chassis serial number',
    'baseboard serial number',
    'motherboard serial number',
    'product id',
    'service tag',
    'asset tag',
  ].indexOf(labelNormalizada);
  return p === -1 ? 99 : p;
};

const encontrarChave = (rawLabel) => {
  const norm = normalizarLabel(rawLabel);
  if (!norm) return null;
  const direto = STATIC_LABELS_PREPARADOS.get(norm);
  if (direto) return { chave: direto, labelMatch: norm };
  for (const [key, sinonimos] of Object.entries(LABEL_SYNONYMS)) {
    for (const sin of sinonimos) {
      const s = normalizarLabel(sin);
      if (!s) continue;
      if (norm.includes(s) || s.includes(norm)) {
        return { chave: key, labelMatch: s };
      }
    }
  }
  return null;
};

const adicionarComContexto = (resultado, chave, valor, contexto, rawLabel) => {
  if (!chave || !valor) return;
  if (!resultado.raw[chave]) resultado.raw[chave] = [];
  resultado.raw[chave].push({ valor, contexto, rawLabel });
};

export const extrairCamposDeEstruturaParseada = (parsed) => {
  const resultado = {
    raw: {
      NOME: [],
      USUARIO_NOME: [],
      FABRICANTE: [],
      MODELO_ORIGINAL: [],
      SERIAL: [],
      MAC_ADDRESS: [],
      PROCESSADOR: [],
      MEMORIA: [],
      DATA_AQUISICAO: [],
    },
    secoesEncontradas: new Set(),
    labelsMatchCount: 0,
  };

  if (parsed?.valido !== true) {
    return resultado;
  }

  parsed.tabelas.forEach((tabela, idxTabela) => {
    let contextoSecao = '';
    tabela.forEach((linha) => {
      if (linha.celulas.length === 0) return;
      const primeira = normalizarTexto(linha.celulas[0]);
      if (linha.celulas.length === 1 && primeira.length > 2 && primeira.length < 120) {
        contextoSecao = primeira;
        return;
      }
      if (linha.celulas.length === 2) {
        const keyInfo = encontrarChave(primeira);
        if (keyInfo?.chave) {
          const valor = normalizarTexto(linha.celulas[1]);
          adicionarComContexto(resultado, keyInfo.chave, valor, contextoSecao, primeira);
          resultado.secoesEncontradas.add(contextoSecao || `tabela-${idxTabela}`);
          resultado.labelsMatchCount += 1;
        }
        return;
      }
      for (let i = 0; i < linha.celulas.length - 1; i += 1) {
        const keyInfo = encontrarChave(linha.celulas[i]);
        if (keyInfo?.chave) {
          const valor = normalizarTexto(linha.celulas[i + 1]);
          if (valor) {
            adicionarComContexto(resultado, keyInfo.chave, valor, contextoSecao, normalizarTexto(linha.celulas[i]));
            resultado.labelsMatchCount += 1;
          }
        }
      }
    });
  });

  const paresProximos = [];
  for (let i = 0; i < parsed.textos.length - 1; i += 1) {
    const atual = parsed.textos[i];
    const proximo = parsed.textos[i + 1];
    if (!atual || !proximo || !atual.text || !proximo.text) continue;
    if (atual.text.length > 120 || proximo.text.length > 300) continue;
    const keyInfo = encontrarChave(atual.text);
    if (keyInfo?.chave) {
      paresProximos.push({ chave: keyInfo.chave, label: atual.text, valor: proximo.text, tag: proximo.tag, contexto: '' });
    }
  }

  paresProximos.forEach((p) => {
    const valor = normalizarTexto(p.valor);
    if (valor && valor.length < 300) {
      adicionarComContexto(resultado, p.chave, valor, p.tag, p.label);
      resultado.labelsMatchCount += 1;
    }
  });

  if (resultado.raw.SERIAL.length > 1) {
    resultado.raw.SERIAL.sort((a, b) => prioridadeSerial(normalizarLabel(a.rawLabel)) - prioridadeSerial(normalizarLabel(b.rawLabel)));
  }

  return resultado;
};
