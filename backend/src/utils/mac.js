// Funções utilitárias para MAC Address

// Remove caracteres não hex e deixa em maiúsculo
export const sanitizeMac = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  return raw.replaceAll(/[^0-9a-fA-F]/g, '').toUpperCase();
};

// Formata para estilo Cisco: AAAA.BBBB.CCCC
export const formatMacCisco = (raw) => {
  const s = sanitizeMac(raw);
  if (s.length !== 12) return null;
  return `${s.slice(0, 4)}.${s.slice(4, 8)}.${s.slice(8, 12)}`;
};

// Valida formato Cisco (AAAA.BBBB.CCCC)
export const isValidMacCisco = (mac) => {
  if (!mac || typeof mac !== 'string') return false;
  return /^[0-9A-F]{4}\.[0-9A-F]{4}\.[0-9A-F]{4}$/.test(mac);
};

// Normaliza qualquer entrada para formato Cisco; retorna null se inválido
export const normalizeToCiscoMac = (raw) => {
  const formatted = formatMacCisco(raw);
  return formatted;
};