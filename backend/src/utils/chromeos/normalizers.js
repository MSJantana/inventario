import {
  normalizarTexto,
  normalizarSerial,
  normalizarNome,  
  normalizarMacEntrada,
} from '../winaudit/normalizers.js';

const CHROMEOS_IMPORTER_VERSION = process.env.CHROMEOS_IMPORTER_VERSION || '1.0.0';

export const CHROMEOS_IMPORTER_VERSION_STR = CHROMEOS_IMPORTER_VERSION;

const MAPA_COLUNAS = [
  { chave: 'deviceId', sin: ['device id', 'deviceid', 'device_id', 'device'] },
  { chave: 'serialNumber', sin: ['serial number', 'serialnumber', 'serial', 's/n', 'serial_no', 'sn'] },
  { chave: 'model', sin: ['modelo', 'model name', 'device model'] },
  { chave: 'osVersion', sin: ['os version', 'chromeos version', 'chrome_os_version', 'osversion'] },
  { chave: 'orgUnitPath', sin: ['org unit path', 'orgunit', 'org unit', 'organizational unit', 'organizationalunit'] },
  { chave: 'provisionStatus', sin: ['provision status', 'status', 'provisionstate', 'provision'] },
  { chave: 'annotatedAssetId', sin: ['asset id', 'annotatedassetid', 'assetid', 'annotated asset id', 'asset'] },
  { chave: 'annotatedUser', sin: ['user', 'annotated user', 'annotateduser', 'assigned user', 'usuário', 'usuario'] },
  { chave: 'annotatedLocation', sin: ['location', 'annotated location', 'annotatedlocation', 'localização', 'localizacao'] },
  { chave: 'annotatedNotes', sin: ['notes', 'annotated notes', 'annotatednotes', 'observações', 'observacoes'] },
  { chave: 'ethernetMacAddress', sin: ['ethernet mac', 'ethernet mac address', 'ethernetmac', 'wired mac', 'ethernet_mac'] },
  { chave: 'macAddress', sin: ['mac address', 'mac', 'wifi mac', 'wifi mac address', 'wireless mac', 'macaddress', 'wifimac'] },
  { chave: 'lastPolicySyncMs', sin: ['last sync', 'last policy sync', 'lastpolicysync', 'last sync time', 'policy sync', 'lastpolicysyncms', 'last policy sync time', 'last sync date', 'lastenrollmenttime', 'last enrollment time', 'last seen'] },
  { chave: 'autoUpdateExpiration', sin: ['auto update expiration', 'au expiration', 'expiration', 'auto update', 'auto update expires', 'autoupdateexpiration', 'auto update expiration date', 'aue date', 'aue', 'auto-update expiration', 'expiration date', 'auto update expiry date'] },
  { chave: 'firstSync', sin: ['first sync', 'first enrollment time', 'firstenrollment', 'first sync date', 'first enrollment', 'first provision date', 'enrollment date', 'first seen date', 'provisioned on', 'provision date'] },
  { chave: 'firmwareVersion', sin: ['firmware version', 'firmwareversion', 'firmware', 'bios version'] },
  { chave: 'platformVersion', sin: ['platform version', 'platformversion'] },
  { chave: 'boardModel', sin: ['board', 'board model', 'chrome platform', 'chrome board'] },
  { chave: 'processorModel', sin: ['processor model', 'processor', 'cpu model', 'cpu', 'processador'] },
  { chave: 'memoryTotalRaw', sin: ['ram total', 'ram total (bytes)', 'memory total (bytes)', 'memory total', 'memoria total', 'total ram', 'total ram (bytes)', 'system memory (total)', 'system memory total (bytes)', 'total system memory (bytes)', 'memory (total)', 'ram (total)', 'mem ram', 'memoria ram'] },
  { chave: 'storageTotalRaw', sin: ['storage total', 'storage total (bytes)', 'disk total (bytes)', 'disco total', 'total storage', 'total storage (bytes)', 'total disk space (bytes)', 'total disk (bytes)', 'storage device capacity (bytes)', 'internal storage total (bytes)', 'disk (total)', 'storage (total)'] },
  { chave: 'memoryFreeRaw', sin: ['ram free', 'ram free (bytes)', 'memory free (bytes)', 'memory free', 'memoria livre', 'free ram', 'free ram (bytes)', 'available ram (bytes)'] },
  { chave: 'storageFreeRaw', sin: ['storage free', 'storage free (bytes)', 'disk free (bytes)', 'disco livre', 'free disk space (bytes)', 'available storage (bytes)', 'free storage (bytes)'] },
  { chave: 'wifiSignalStrengthRaw', sin: ['wifi signal strength', 'signal strength', 'wifi signal', 'rssi', 'wi-fi signal strength (dbm)', 'wifi (dbm)'] },
  { chave: 'cpuTempRaw', sin: ['cpu temp', 'cpu temp (celsius)', 'cpu temperature', 'temperatura cpu', 'cpu temp (c)'] },
  { chave: 'manufacturerName', sin: ['manufacturer', 'manufacturer name', 'fabricante', 'hardware manufacturer'] },
  { chave: 'recentUsers', sin: ['recent users', 'recentusers', 'last user email', 'recent users emails'] },
];

const normalizarChave = (s) => {
  const t = normalizarTexto(s);
  if (!t) return '';
  return t.toLowerCase().replace(/[\s_-]+/g, ' ').trim();
};

export const reconhecerColuna = (chave) => {
  const original = typeof chave === 'string' ? chave : '';
  if (!original) return null;
  const n = normalizarChave(original);
  for (const entrada of MAPA_COLUNAS) {
    if (normalizarChave(entrada.chave) === n) return entrada.chave;
    for (const s of entrada.sin) {
      if (normalizarChave(s) === n) return entrada.chave;
    }
  }
  return null;
};

const extrairCampo = (linhaRaw, alvo) => {
  if (!linhaRaw || typeof linhaRaw !== 'object') return '';
  const direto = linhaRaw[alvo];
  if (typeof direto === 'string' && direto.trim() !== '') return direto;
  for (const k of Object.keys(linhaRaw)) {
    const reconhecida = reconhecerColuna(k);
    if (reconhecida === alvo) {
      const v = linhaRaw[k];
      if (typeof v === 'string' && v.trim() !== '') return v;
      if (v != null && v !== undefined) return String(v);
    }
  }
  return '';
};

const PARSEAR_DATA_AMPMS = (s) => {
  if (!s) return null;
  const raw = String(s).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const [ano, mes] = raw.split('-').map((p) => Number.parseInt(p, 10));
    if (Number.isFinite(ano) && Number.isFinite(mes) && mes >= 1 && mes <= 12) {
      return new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0, 0));
    }
  }
  const rx1 = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?)?$/i;
  const m1 = rx1.exec(raw);
  if (m1) {
    const [, yy, mo, dd, hh = 0, mi = 0, ss = 0, ap] = m1;
    let h = Number.parseInt(hh, 10) || 0;
    const periodo = (ap || '').toUpperCase();
    if (periodo === 'PM' && h < 12) h += 12;
    if (periodo === 'AM' && h === 12) h = 0;
    const u = Date.UTC(
      Number.parseInt(yy, 10),
      (Number.parseInt(mo, 10) || 1) - 1,
      Number.parseInt(dd, 10) || 1,
      h,
      Number.parseInt(mi, 10) || 0,
      Number.parseInt(ss, 10) || 0,
      0
    );
    if (Number.isFinite(u)) return new Date(u);
  }
  const rx2 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?)?$/i;
  const m2 = rx2.exec(raw);
  if (m2) {
    const [, mm, dd, yy, hh = 0, mi = 0, ss = 0, ap] = m2;
    let h = Number.parseInt(hh, 10) || 0;
    const periodo = (ap || '').toUpperCase();
    if (periodo === 'PM' && h < 12) h += 12;
    if (periodo === 'AM' && h === 12) h = 0;
    const u = Date.UTC(
      Number.parseInt(yy, 10),
      (Number.parseInt(mm, 10) || 1) - 1,
      Number.parseInt(dd, 10) || 1,
      h,
      Number.parseInt(mi, 10) || 0,
      Number.parseInt(ss, 10) || 0,
      0
    );
    if (Number.isFinite(u)) return new Date(u);
  }
  return null;
};

export const epochMsOuIsoParaDate = (v) => {
  if (v === null || v === undefined) return null;
  let s = '';
  if (typeof v === 'string') s = v.trim();
  else if (typeof v === 'number') s = String(v);
  else s = String(v);
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    const n = Number.parseInt(s, 10);
    if (!Number.isFinite(n)) return null;
    const d = new Date(n);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }
  const custom = PARSEAR_DATA_AMPMS(s);
  if (custom) return custom.toISOString();
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const extrairCampoComoStr = (linhaRaw, alvo) => {
  const v = extrairCampo(linhaRaw, alvo);
  if (typeof v === 'string') return v;
  if (v == null) return '';
  return String(v);
};

const dataAquisicaoDefault = () => new Date().toISOString().slice(0, 10);

const DETECTAR_DATAS_POR_CONTEUDO = (linhaRaw) => {
  const saida = { lastSync: null, firstSync: null, autoUpdateExpiration: null };
  if (!linhaRaw || typeof linhaRaw !== 'object') return saida;
  const valores = Array.isArray(linhaRaw) ? linhaRaw.slice() : Object.values(linhaRaw);
  const datasComHora = [];
  for (let i = 0; i < valores.length; i += 1) {
    const raw = valores[i];
    if (typeof raw !== 'string') continue;
    const s = raw.trim();
    if (!s) continue;
    if (/^\d{4}-\d{2}$/.test(s)) {
      if (!saida.autoUpdateExpiration) saida.autoUpdateExpiration = s;
      continue;
    }
    const parseada = PARSEAR_DATA_AMPMS(s);
    if (parseada && Number.isFinite(parseada.getTime())) {
      const t = parseada.getTime();
      if (t > 1_420_071_600_000 && t < 4_102_444_800_000) {
        datasComHora.push({ t, s });
      }
    }
  }
  if (datasComHora.length === 1) {
    saida.lastSync = datasComHora[0].s;
    saida.firstSync = datasComHora[0].s;
  } else if (datasComHora.length >= 2) {
    datasComHora.sort((a, b) => a.t - b.t);
    saida.firstSync = datasComHora[0].s;
    saida.lastSync = datasComHora[datasComHora.length - 1].s;
  }
  return saida;
};

const textoSemAcentos = (s) => {
  const t = normalizarTexto(s);
  if (!t) return '';
  try {
    return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  } catch {
    return t.toLowerCase();
  }
};

const calcularScore = (segmento, escola) => {
  const seg = textoSemAcentos(segmento);
  if (!seg) return 0;
  const nome = textoSemAcentos(escola.nome);
  const sigla = textoSemAcentos(escola.sigla);
  let score = 0;
  if (sigla && seg === sigla) score += 100;
  if (nome && seg === nome) score += 90;
  if (nome && nome.includes(seg) && seg.length >= 3) score += 30;
  if (sigla && nome.includes(seg) === false && seg.includes(sigla) && sigla.length >= 2) score += 20;
  if (seg.length >= 5 && nome?.includes(seg)) score += 25;
  return score;
};

const extrairSegmentosOrgUnit = (orgPath) => {
  const s = normalizarTexto(orgPath);
  if (!s) return [];
  return s.split('/').map((p) => p.trim()).filter(Boolean);
};

export const resolverEscolaPorOrgUnit = (orgUnitPath, escolasDisp) => {
  const resultado = {
    escolaId: null,
    escolaPendente: true,
    candidatos: [],
    avisos: [],
  };
  const escolas = Array.isArray(escolasDisp) ? escolasDisp : [];
  if (escolas.length === 0) return resultado;
  const segmentos = extrairSegmentosOrgUnit(orgUnitPath);
  if (segmentos.length === 0) return resultado;

  const porEscola = new Map();
  for (const escola of escolas) {
    let score = 0;
    for (const seg of segmentos) {
      score += calcularScore(seg, escola);
    }
    if (score > 0) porEscola.set(escola.id, { escola, score });
  }

  const rank = Array.from(porEscola.values())
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.escola.nome.localeCompare(b.escola.nome, 'pt-BR');
    });

  if (rank.length === 0) return resultado;
  const candidatos = rank.slice(0, 5).map((r) => r.escola);
  resultado.candidatos = candidatos;
  if (rank.length === 1 || (rank.length > 1 && rank[0].score > rank[1].score * 2)) {
    resultado.escolaId = rank[0].escola.id;
    resultado.escolaPendente = false;
    return resultado;
  }
  resultado.escolaPendente = true;
  return resultado;
};

export const normalizarLinhaChromeOS = (linhaRaw, idx) => {
  const saida = {
    idxLinha: typeof idx === 'number' ? idx : 0,
    valido: true,
    erroMotivo: null,
    camposOriginais: linhaRaw || {},
    deviceId: '',
    serialNumber: '',
    model: '',
    osVersion: '',
    orgUnitPath: '',
    provisionStatus: '',
    annotatedAssetId: '',
    annotatedUser: '',
    annotatedLocation: '',
    annotatedNotes: '',
    ethernetMacAddress: '',
    macAddress: '',
    lastPolicySyncMs: null,
    autoUpdateExpiration: null,
    firstSync: null,
    firmwareVersion: '',
    platformVersion: '',
    boardModel: '',
    processorModel: '',
    memoryTotalRaw: '',
    storageTotalRaw: '',
    manufacturerName: '',
    recentUsers: '',
  };

  let normalizadaRaw = linhaRaw;
  if (Array.isArray(linhaRaw)) {
    const MAPA_POSICIONAL = [
      'deviceId',
      'serialNumber',
      'model',
      'lastSync',
      'firstSync',
      'osVersion',
      'orgUnitPath',
      'provisionStatus',
      'annotatedAssetId',
      'annotatedUser',
      'annotatedLocation',
      'annotatedNotes',
      'ethernetMacAddress',
      'macAddress',
      null,
      'autoUpdateExpiration',
      'bootMode',
      'platformVersion',
      'firmwareVersion',
      'lastEnrollmentReason',
      'lastPolicyRequest',
      'activeTimeRanges',
      'recentUsers',
      'wifiSignalStrengthRaw',
      null,
      null,
      null,
      null,
      'cpuTempRaw',
      'publicIpAddress',
      'ipAddress',
      'lastPolicySyncTime',
      'bootMode2',
      'activityReportDeviceState',
      'bootMode3',
      'notes',
    ];
    const obj = {};
    for (let i = 0; i < linhaRaw.length && i < MAPA_POSICIONAL.length; i += 1) {
      const chave = MAPA_POSICIONAL[i];
      if (chave) obj[chave] = linhaRaw[i];
    }
    if (obj.lastSync && !obj.lastPolicySyncMs) obj.lastPolicySyncMs = obj.lastSync;
    normalizadaRaw = obj;
  } else if (!normalizadaRaw || typeof normalizadaRaw !== 'object') {
    normalizadaRaw = {};
  }

  try {
    const datasPorConteudo = DETECTAR_DATAS_POR_CONTEUDO(linhaRaw);
    if (datasPorConteudo.firstSync) {
      const temFirst = extrairCampoComoStr(normalizadaRaw, 'firstSync');
      if (!temFirst) normalizadaRaw.firstSync = datasPorConteudo.firstSync;
    }
    if (datasPorConteudo.lastSync) {
      const temLast = extrairCampoComoStr(normalizadaRaw, 'lastPolicySyncMs') || extrairCampoComoStr(normalizadaRaw, 'lastSync');
      if (!temLast) {
        normalizadaRaw.lastSync = datasPorConteudo.lastSync;
        normalizadaRaw.lastPolicySyncMs = datasPorConteudo.lastSync;
      }
    }
    if (datasPorConteudo.autoUpdateExpiration) {
      const temAue = extrairCampoComoStr(normalizadaRaw, 'autoUpdateExpiration');
      if (!temAue) normalizadaRaw.autoUpdateExpiration = datasPorConteudo.autoUpdateExpiration;
    }
  } catch { /* ignore fallback heuristic */ }

  saida.deviceId = extrairCampoComoStr(normalizadaRaw, 'deviceId');
  saida.serialNumber = extrairCampoComoStr(normalizadaRaw, 'serialNumber');
  saida.model = extrairCampoComoStr(normalizadaRaw, 'model');
  saida.osVersion = extrairCampoComoStr(normalizadaRaw, 'osVersion');
  saida.orgUnitPath = extrairCampoComoStr(normalizadaRaw, 'orgUnitPath');
  saida.provisionStatus = extrairCampoComoStr(normalizadaRaw, 'provisionStatus');
  saida.annotatedAssetId = extrairCampoComoStr(normalizadaRaw, 'annotatedAssetId');
  saida.annotatedUser = extrairCampoComoStr(normalizadaRaw, 'annotatedUser');
  saida.annotatedLocation = extrairCampoComoStr(normalizadaRaw, 'annotatedLocation');
  saida.annotatedNotes = extrairCampoComoStr(normalizadaRaw, 'annotatedNotes');
  saida.ethernetMacAddress = extrairCampoComoStr(normalizadaRaw, 'ethernetMacAddress');
  saida.macAddress = extrairCampoComoStr(normalizadaRaw, 'macAddress');
  saida.firmwareVersion = extrairCampoComoStr(normalizadaRaw, 'firmwareVersion');
  saida.platformVersion = extrairCampoComoStr(normalizadaRaw, 'platformVersion');
  saida.boardModel = extrairCampoComoStr(normalizadaRaw, 'boardModel');
  saida.processorModel = extrairCampoComoStr(normalizadaRaw, 'processorModel');
  saida.memoryTotalRaw = extrairCampoComoStr(normalizadaRaw, 'memoryTotalRaw');
  saida.storageTotalRaw = extrairCampoComoStr(normalizadaRaw, 'storageTotalRaw');
  saida.manufacturerName = extrairCampoComoStr(normalizadaRaw, 'manufacturerName');
  saida.recentUsers = extrairCampoComoStr(normalizadaRaw, 'recentUsers');

  if (!saida.memoryTotalRaw || !saida.storageTotalRaw) {
    try {
      const baseArray = Array.isArray(linhaRaw) ? linhaRaw.slice() : [];
      const valores = baseArray.length > 0
        ? baseArray
        : (Array.isArray(normalizadaRaw) ? normalizadaRaw.slice() : Object.values(normalizadaRaw || {}));
      const candidatos = [];
      for (let idx = 0; idx < valores.length; idx += 1) {
        const v = typeof valores[idx] === 'string' ? valores[idx].trim() : '';
        if (!v) continue;
        if (!v.includes('/')) continue;
        const splitPorBarra = v.split('/').map((p) => Number(String(p).replace(/[^\d.]/g, ''))).filter(Number.isFinite);
        if (splitPorBarra.length < 2) continue;
        const [x, y] = splitPorBarra;
        if (x > 500_000_000 && y > 500_000_000) {
          candidatos.push({ v, idx, menor: Math.min(x, y), maior: Math.max(x, y) });
        }
      }
      candidatos.sort((a, b) => a.maior - b.maior || a.idx - b.idx);
      if (candidatos.length >= 1 && !saida.memoryTotalRaw) saida.memoryTotalRaw = candidatos[0].v;
      if (candidatos.length >= 2 && !saida.storageTotalRaw) saida.storageTotalRaw = candidatos[1].v;
    } catch { /* ignore fallback errors */ }
  }

  const rawSync = extrairCampo(normalizadaRaw, 'lastPolicySyncMs');
  saida.lastPolicySyncMs = epochMsOuIsoParaDate(rawSync);
  const rawExp = extrairCampo(normalizadaRaw, 'autoUpdateExpiration');
  saida.autoUpdateExpiration = epochMsOuIsoParaDate(rawExp);
  const rawFirst = extrairCampo(normalizadaRaw, 'firstSync');
  saida.firstSync = epochMsOuIsoParaDate(rawFirst);

  const serial = normalizarSerial(saida.serialNumber || saida.deviceId);
  const model = normalizarTexto(saida.model);
  if (!serial) {
    saida.valido = false;
    saida.erroMotivo = 'serialNumber (ou deviceId como fallback) ausente.';
    return saida;
  }
  if (!model) {
    saida.valido = false;
    saida.erroMotivo = 'model ausente.';
    return saida;
  }
  return saida;
};

const RECENT_USERS_SPLIT = /[,;\s]+/;

const extrairUsuarioMaisRecente = (rawAnnotated, rawRecent) => {
  const anotado = normalizarTexto(rawAnnotated);
  if (anotado) return anotado;
  const recent = normalizarTexto(rawRecent);
  if (!recent) return '';
  const partes = recent.split(RECENT_USERS_SPLIT).map((p) => p.trim()).filter(Boolean);
  if (partes.length === 0) return '';
  return partes[0];
};

const NORMALIZAR_EMAIL_LOCAL = (s) => {
  if (!s) return '';
  const t = String(s).trim();
  if (!t) return '';
  const idx = t.indexOf('@');
  if (idx === -1) return t;
  const local = t.slice(0, idx);
  if (!local) return t;
  return local.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
};

const NORMALIZAR_NOME_EXIBICAO_USUARIO = (rawUsuario) => {
  const bruto = normalizarTexto(rawUsuario);
  if (!bruto) return '';
  const temArroba = bruto.includes('@');
  if (!temArroba) return bruto;
  const primeiraParte = NORMALIZAR_EMAIL_LOCAL(bruto);
  if (primeiraParte.includes(' ')) {
    return primeiraParte
      .split(' ')
      .filter(Boolean)
      .map((w) => (w.length <= 2 ? w.toLowerCase() : (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())))
      .join(' ');
  }
  return primeiraParte || bruto;
};

const EXTRAIR_MEMORIA_GB = (raw, totalSeguro) => {
  const str = normalizarTexto(raw);
  if (!str) return null;
  const numeros = str
    .split(/\s+|\/|,|;/g)
    .map((p) => Number.parseFloat(p.replace(/[^\d.]/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (numeros.length === 0) return null;
  let bytes = null;
  if (totalSeguro && numeros.length >= 2) {
    const a = numeros[0];
    const b = numeros[1];
    if (a >= 1_073_741_824 && b >= 1_073_741_824 && b > a) {
      bytes = b;
    } else if (b >= 536_870_912 && a < 1_073_741_824) {
      bytes = b;
    } else if (a <= 1) {
      bytes = Math.max(a, b);
    } else {
      bytes = Math.max(...numeros);
    }
  } else {
    bytes = Math.max(...numeros);
  }
  if (bytes === null || bytes <= 0) return null;
  if (bytes < 128) return `${Math.round(bytes)} GB`;
  const base1024 = bytes / 1024 / 1024 / 1024;
  if (base1024 >= 0.5) {
    const arredondado = Math.max(1, Math.round(base1024));
    return `${arredondado} GB`;
  }
  const base1000 = bytes / 1_000_000_000;
  const arredondado = Math.max(1, Math.round(base1000));
  return `${arredondado} GB`;
};

const EXTRAIR_FABRICANTE = (nomeModelo, manufacturerRaw) => {
  const manuf = normalizarTexto(manufacturerRaw);
  if (manuf) return manuf;
  const m = normalizarTexto(nomeModelo || '').toLowerCase();
  if (!m) return null;
  const regras = [
    { rx: /(^|[\s-])samsung($|[\s-])/i, marca: 'Samsung' },
    { rx: /(^|[\s-])hp($|[\s-]|elitebook|probook|chromebook)/i, marca: 'HP' },
    { rx: /hewlett[-\s]?packard/i, marca: 'HP' },
    { rx: /(^|[\s-])lenovo($|[\s-]|thinkpad|ideapad|yoga)/i, marca: 'Lenovo' },
    { rx: /(^|[\s-])acer($|[\s-]|chromebook|spin|swift)/i, marca: 'Acer' },
    { rx: /(^|[\s-])asus($|[\s-]|chromebook|zenbook|vivobook)/i, marca: 'Asus' },
    { rx: /(^|[\s-])dell($|[\s-]|latitude|inspiron|precision|chromebook)/i, marca: 'Dell' },
    { rx: /(^|[\s-])ctl($|[\s-])/i, marca: 'CTL' },
    { rx: /(^|[\s-])google($|[\s-]|pixelbook)/i, marca: 'Google' },
    { rx: /(^|[\s-])asus($|[\s-])/i, marca: 'Asus' },
  ];
  for (const r of regras) {
    if (r.rx.test(m)) return r.marca;
  }
  const palavras = m.split(/\s+/).filter(Boolean);
  if (palavras.length >= 1 && palavras[0].length >= 3) {
    return palavras[0].charAt(0).toUpperCase() + palavras[0].slice(1);
  }
  return null;
};

const EXTRAIR_PROCESSADOR = (processor, firmware, board, platform, modeloNome) => {
  const proc = normalizarTexto(processor);
  if (proc) return proc;
  const fw = normalizarTexto(firmware).toLowerCase();
  const brd = normalizarTexto(board).toLowerCase();
  const pl = normalizarTexto(platform).toLowerCase();
  const md = normalizarTexto(modeloNome).toLowerCase();
  const juncao = [fw, brd, pl, md].filter(Boolean).join(' | ');
  if (!juncao) return null;
  const boards = [
    { rx: /(^|[\W_])celes([\W_]|$)/i, proc: 'Intel Celeron N3060 (Board Celes)' },
    { rx: /(^|[\W_])reef([\W_]|$)/i, proc: 'Intel Celeron N3350 / N3450 (Board Reef)' },
    { rx: /(^|[\W_])sand([\W_]|$)/i, proc: 'Intel Celeron N4020 / N4120 (Board Sand)' },
    { rx: /(^|[\W_])hatch([\W_]|$)/i, proc: 'Intel Celeron N4020 / N4120 (Board Hatch)' },
    { rx: /(^|[\W_])kodama([\W_]|$)/i, proc: 'MediaTek Kompanio 500 (Board Kodama)' },
    { rx: /(^|[\W_])krane([\W_]|$)/i, proc: 'MediaTek Kompanio 820 (Board Krane)' },
    { rx: /(^|[\W_])trogdor([\W_]|$)/i, proc: 'Qualcomm Snapdragon 7c / SC7180 (Board Trogdor)' },
    { rx: /(^|[\W_])coachz([\W_]|$)/i, proc: 'Qualcomm Snapdragon 7c+ Gen3 / SC7280 (Board Coachz)' },
    { rx: /(^|[\W_])dedede([\W_]|$)/i, proc: 'Intel Celeron N4500 / N5100 (Board Dedede)' },
    { rx: /(^|[\W_])corsola([\W_]|$)/i, proc: 'MediaTek Kompanio 520 (Board Corsola)' },
    { rx: /(^|[\W_])gumboz([\W_]|$)/i, proc: 'Intel Alder Lake N100 (Board Gumboz)' },
    { rx: /(^|[\W_])nissa([\W_]|$)/i, proc: 'Intel Alder Lake N100 / N200 (Board Nissa)' },
    { rx: /(^|[\W_])octopus([\W_]|$)/i, proc: 'MediaTek MT8173C / Intel Celeron N4020 (Board Octopus)' },
    { rx: /(^|[\W_])phaser([\W_]|$)/i, proc: 'MediaTek MT8173C (Board Phaser - Octopus family)' },
    { rx: /(^|[\W_])grunt([\W_]|$)/i, proc: 'Intel Celeron N4000 / N4100 (Board Grunt)' },
    { rx: /(^|[\W_])zorc([\W_]|$)/i, proc: 'AMD A4 / A6 (Board Zork)' },
    { rx: /(^|[\W_])woomax([\W_]|$)/i, proc: 'MediaTek MT8183 (Board Woomax)' },
    { rx: /(^|[\W_])willow([\W_]|$)/i, proc: 'Intel Celeron N5105 / Jasper Lake (Board Willow)' },
  ];
  for (const b of boards) {
    if (b.rx.test(juncao)) return b.proc;
  }
  return null;
};

const CALCULAR_DATA_AQUISICAO = (firstSync, autoUpdate, hoje) => {
  if (firstSync) {
    try {
      const d = new Date(firstSync);
      if (!Number.isNaN(d.getTime())) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const d2 = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d2}`;
      }
    } catch { /* ignore */ }
  }
  if (autoUpdate) {
    try {
      const d = new Date(autoUpdate);
      if (!Number.isNaN(d.getTime())) {
        const anoUtc = d.getUTCFullYear() - 5;
        const mesUtc = d.getUTCMonth();
        const diaUtc = d.getUTCDate();
        if (anoUtc > 2000) {
          const u = Date.UTC(anoUtc, mesUtc, diaUtc, 0, 0, 0, 0);
          const dataCorrigida = new Date(u);
          const y = dataCorrigida.getUTCFullYear();
          const m = String(dataCorrigida.getUTCMonth() + 1).padStart(2, '0');
          const d2 = String(dataCorrigida.getUTCDate()).padStart(2, '0');
          return `${y}-${m}-${d2}`;
        }
      }
    } catch { /* ignore */ }
  }
  const h = hoje instanceof Date && !Number.isNaN(hoje.getTime()) ? hoje : new Date();
  const y = h.getUTCFullYear();
  const m = String(h.getUTCMonth() + 1).padStart(2, '0');
  const d2 = String(h.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d2}`;
};

const montarObservacoes = (raw) => {
  const partes = [];
  if (raw.annotatedNotes) {
    partes.push(normalizarTexto(raw.annotatedNotes));
  }
  const chrome = [];
  if (raw.osVersion) chrome.push(`OS: ${normalizarTexto(raw.osVersion)}`);
  if (raw.provisionStatus) chrome.push(`Provisionamento: ${normalizarTexto(raw.provisionStatus)}`);
  if (raw.autoUpdateExpiration) chrome.push(`AutoUpdate Expira: ${raw.autoUpdateExpiration.slice(0, 10)}`);
  if (chrome.length > 0) {
    partes.push(`[ChromeOS] ${chrome.join(' · ')}`);
  }
  const juncao = partes.filter(Boolean).join('\n').trim();
  return juncao || null;
};

export const montarEquipamentoNormalizado = (normalizedRaw, contexto) => {
  const ctx = contexto || {};
  const raw = normalizedRaw || {};
  const avisos = [];

  const asset = normalizarTexto(raw.annotatedAssetId);
  const serialLimpo = normalizarSerial(raw.serialNumber || raw.deviceId);
  const suffix = asset || serialLimpo || ('LINHA-' + (raw.idxLinha ?? 0));
  const nome = normalizarNome(`CB-${suffix}`);

  const macWifiStr = normalizarTexto(raw.macAddress);
  const macEthStr = normalizarTexto(raw.ethernetMacAddress);
  const resultadoWifi = macWifiStr ? normalizarMacEntrada(macWifiStr) : { valor: null, valido: false };
  const resultadoEth = macEthStr ? normalizarMacEntrada(macEthStr) : { valor: null, valido: false };
  let macFinal = null;
  if (resultadoWifi.valido && resultadoWifi.valor) {
    macFinal = resultadoWifi.valor;
  } else if (resultadoEth.valido && resultadoEth.valor) {
    macFinal = resultadoEth.valor;
    avisos.push('MAC WiFi não encontrado; usando Ethernet MAC.');
  } else if (macWifiStr || macEthStr) {
    avisos.push('Endereços MAC presentes mas inválidos.');
  }

  const usuarioNomeRawEmail = extrairUsuarioMaisRecente(raw.annotatedUser, raw.recentUsers);
  const usuarioNomeExibicao = NORMALIZAR_NOME_EXIBICAO_USUARIO(usuarioNomeRawEmail);
  const usuarioNomeFinal = usuarioNomeExibicao || 'Chromebook (sem usuário)';
  if (usuarioNomeRawEmail && usuarioNomeRawEmail.includes('@') && !raw.annotatedUser) {
    avisos.push('Usuário anotado estava vazio; usado o primeiro email de "recent users".');
  }

  const escolasDisp = Array.isArray(ctx.escolasDisponiveis) ? ctx.escolasDisponiveis : [];
  const resEscola = resolverEscolaPorOrgUnit(raw.orgUnitPath, escolasDisp);
  const escolaIdInicial = resEscola.escolaId || (ctx.escolaPadraoId || null);
  const escolaPendente = !escolaIdInicial || resEscola.escolaPendente;
  const candidatosEscola = resEscola.candidatos;

  if (Array.isArray(resEscola.avisos)) for (const a of resEscola.avisos) avisos.push(a);

  const modelo = normalizarTexto(raw.model) || 'Chromebook (sem modelo)';
  const dataAquisicao = CALCULAR_DATA_AQUISICAO(raw.firstSync, raw.autoUpdateExpiration, new Date());
  const fabricante = EXTRAIR_FABRICANTE(modelo, raw.manufacturerName);
  const memoria = EXTRAIR_MEMORIA_GB(raw.memoryTotalRaw, true);
  const processador = EXTRAIR_PROCESSADOR(
    raw.processorModel,
    raw.firmwareVersion,
    raw.boardModel,
    raw.platformVersion,
    modelo
  );

  const metadados = {
    tipoFonte: 'CHROMEOS_CSV',
    versaoImportador: CHROMEOS_IMPORTER_VERSION,
    camposOriginais: raw.camposOriginais || {},
    osVersion: raw.osVersion || null,
    orgUnitPath: raw.orgUnitPath || null,
    provisionStatus: raw.provisionStatus || null,
    lastPolicySync: raw.lastPolicySyncMs || null,
    autoUpdateExpiration: raw.autoUpdateExpiration || null,
    firstSync: raw.firstSync || null,
    ethernetMacAddress: raw.ethernetMacAddress || null,
    wifiMacAddress: raw.macAddress || null,
    firmwareVersion: raw.firmwareVersion || null,
    platformVersion: raw.platformVersion || null,
    boardModel: raw.boardModel || null,
    processorModel: raw.processorModel || null,
    memoryTotalRaw: raw.memoryTotalRaw || null,
    storageTotalRaw: raw.storageTotalRaw || null,
    manufacturerName: raw.manufacturerName || null,
    usuarioNomeEmailOriginal: usuarioNomeRawEmail || null,
  };

  const equipamento = {
    nome,
    patrimonio: asset || null,
    usuarioNome: usuarioNomeFinal,
    escolaId: escolaIdInicial,
    tipo: 'CHROMEBOOK',
    status: 'DISPONIVEL',
    modelo,
    serial: serialLimpo,
    localizacao: normalizarTexto(raw.annotatedLocation) || null,
    macaddress: macFinal,
    observacoes: montarObservacoes(raw),
    fabricante,
    processador,
    memoria,
    dataAquisicao,
    sourceExternalId: normalizarTexto(raw.deviceId) || null,
    importMetadata: metadados,
  };

  return {
    equipamento,
    escolaPendente,
    candidatosEscola,
    avisos,
    macs: [resultadoWifi, resultadoEth]
      .filter((r) => r && r.valido && r.valor)
      .map((r) => ({ valor: r.valor })),
  };
};

export default {
  reconhecerColuna,
  epochMsOuIsoParaDate,
  normalizarLinhaChromeOS,
  montarEquipamentoNormalizado,
  resolverEscolaPorOrgUnit,
  CHROMEOS_IMPORTER_VERSION_STR,
};
