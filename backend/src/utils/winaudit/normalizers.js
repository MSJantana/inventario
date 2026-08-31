import {
  sanitizeMac,
  normalizeMacAddress,
  isValidMacAddress,
} from '../mac.js';
import { arrayAt, normalizeNbsp } from '../compat.js';

const MEMORY_UNITS = {
  B: 1 / (1024 * 1024),
  BYTES: 1 / (1024 * 1024),
  BYTE: 1 / (1024 * 1024),
  KB: 1 / 1024,
  K: 1 / 1024,
  MB: 1,
  M: 1,
  GB: 1024,
  G: 1024,
  TB: 1024 * 1024,
  T: 1024 * 1024,
};

const MEMORY_REGEX = /(\d+(?:\.\d+)?)\s*([A-Za-z]+)?/;

const normalizarEspacos = (input) => {
  if (input === null || input === undefined) return '';
  if (typeof input !== 'string') return String(input);
  return normalizeNbsp(input)
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

export const normalizarTexto = (input) => {
  const s = normalizarEspacos(input);
  if (!s) return '';
  try {
    return s.normalize('NFKC').trim();
  } catch {
    return s.trim();
  }
};

export const normalizarSerial = (input) => normalizarTexto(input);

export const normalizarNome = (input) => {
  const s = normalizarTexto(input);
  return s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
};

export const normalizarUsuarioNome = (input) => {
  const s = normalizarTexto(input);
  const parts = s.split('\\');
  return parts.length > 1 ? arrayAt(parts, -1) : s;
};

export const converterMemoriaParaMB = (input) => {
  const s = normalizarTexto(input);
  if (!s) return { megabytes: null, raw: input, valido: false, mensagem: 'Não informado' };

  const match = MEMORY_REGEX.exec(s);
  if (!match) {
    return { megabytes: null, raw: input, valido: false, mensagem: 'Formato de memória inválido' };
  }

  const value = Number.parseFloat(match[1]);
  const unitRaw = (match[2] || 'MB').toUpperCase();
  const multiplier = MEMORY_UNITS[unitRaw];

  if (!Number.isFinite(value) || value <= 0 || multiplier === undefined) {
    return { megabytes: null, raw: input, valido: false, mensagem: 'Formato de memória inválido' };
  }

  const megabytes = Math.round(value * multiplier);
  if (megabytes <= 0) {
    return { megabytes: null, raw: input, valido: false, mensagem: 'Valor de memória inválido' };
  }
  return { megabytes, raw: input, valido: true, mensagem: null };
};

export const formatarMemoriaParaExibicao = (megabytes) => {
  if (!Number.isFinite(megabytes) || megabytes <= 0) return '';
  if (megabytes >= 1024 * 1024) {
    const tb = (megabytes / (1024 * 1024));
    return `${tb % 1 === 0 ? Math.round(tb) : tb.toFixed(1)} TB`;
  }
  if (megabytes >= 1024) {
    const gb = megabytes / 1024;
    return `${gb % 1 === 0 ? Math.round(gb) : gb.toFixed(1)} GB`;
  }
  return `${Math.round(megabytes)} MB`;
};

export const salvarMemoriaComoMB = (megabytes) => {
  if (!Number.isFinite(megabytes) || megabytes <= 0) return '';
  return `${Math.round(megabytes)} MB`;
};

export const classificarTipoInterface = (contexto) => {
  const s = normalizarTexto(contexto).toUpperCase();
  if (!s) return 'Outro';
  if (s.includes('ETHERNET') || s.includes('LAN ') || s.includes('LAN)') || s.includes('WIRED')) return 'Ethernet';
  if (s.includes('WI-FI') || s.includes('WIFI') || s.includes('WIRELESS') || s.includes('802.11')) return 'Wi-Fi';
  if (s.includes('BLUETOOTH')) return 'Bluetooth';
  if (s.includes('VPN') || s.includes('VIRTUAL') || s.includes('HYPER-V') || s.includes('VMWARE') || s.includes('VIRTUALBOX') || s.includes('LOOPBACK') || s.includes('WAN MINIPORT')) return 'Virtual';
  return 'Outro';
};

const PADRONIZAR_MAC_REDE_REGEX = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/;

export const normalizarMacEntrada = (raw) => {
  const s = normalizarTexto(raw);
  if (!s) return { valor: null, valido: false, mensagem: 'MAC não informado' };

  const san = sanitizeMac(s);
  if (san.length !== 12) {
    return { valor: null, valido: false, mensagem: 'Tamanho de MAC inválido' };
  }
  if (san === '000000000000' || san === 'FFFFFFFFFFFF') {
    return { valor: null, valido: false, mensagem: 'MAC reservado' };
  }

  const formatado = normalizeMacAddress(s);
  const validoFormato = PADRONIZAR_MAC_REDE_REGEX.test(formatado) && isValidMacAddress(formatado);
  return { valor: formatado, valido: validoFormato, mensagem: validoFormato ? null : 'MAC em formato inválido' };
};

export const montarModeloComposto = (fabricanteInput, modeloInput) => {
  const fabricante = normalizarTexto(fabricanteInput);
  const modelo = normalizarTexto(modeloInput);
  if (!fabricante && !modelo) return { fabricante: '', modeloOriginal: '', modeloComposto: '' };

  if (!fabricante) return { fabricante: '', modeloOriginal: modelo, modeloComposto: modelo };
  if (!modelo) return { fabricante, modeloOriginal: '', modeloComposto: fabricante };

  const fabUpper = fabricante.toUpperCase();
  const modUpper = modelo.toUpperCase();
  if (modUpper.startsWith(fabUpper)) {
    return { fabricante, modeloOriginal: modelo, modeloComposto: modelo };
  }
  const tokensFab = fabUpper.split(/\s+/).filter(Boolean);
  const tokensMod = modUpper.split(/\s+/).filter(Boolean);
  const over = tokensFab.length >= 1 && tokensMod.indexOf(tokensFab[0]) === 0;
  if (over) return { fabricante, modeloOriginal: modelo, modeloComposto: modelo };

  return { fabricante, modeloOriginal: modelo, modeloComposto: `${fabricante} ${modelo}` };
};
