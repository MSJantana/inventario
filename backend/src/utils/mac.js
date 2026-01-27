// Funções utilitárias para MAC Address

// Remove caracteres não hex e deixa em maiúsculo
export const sanitizeMac = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  return raw.replaceAll(/[^0-9a-fA-F]/g, '').toUpperCase();
};

// Formata para estilo padrão: AA:BB:CC:DD:EE:FF
export const formatMacAddress = (raw) => {
  const s = sanitizeMac(raw);
  if (s.length !== 12) return null;
  return s.match(/.{1,2}/g).join(':');
};

// Valida formato padrão (AA:BB:CC:DD:EE:FF)
export const isValidMacAddress = (mac) => {
  if (!mac || typeof mac !== 'string') return false;
  return /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac);
};

// Normaliza qualquer entrada para formato padrão; retorna null se inválido
export const normalizeMacAddress = (raw) => {
  const formatted = formatMacAddress(raw);
  return formatted;
};
