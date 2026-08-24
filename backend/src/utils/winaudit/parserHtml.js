import { parse } from 'node-html-parser';

export const WINAUDIT_SIGNATURES = [
  'winaudit report',
  '<!-- winaudit',
  '<title>winaudit',
  'computer name',
  'user account',
  'win audit',
];

const MAX_BUFFER_SIZE = 2 * 1024 * 1024;

const limparAssinatura = (value) => {
  if (typeof value !== 'string') return value;
  return value
    .replaceAll('\u00a0', ' ')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const assinaturaPresenteNoBuffer = (buffer, originalName) => {
  if (!buffer) return false;
  const sampleBytes = buffer.subarray(0, Math.min(buffer.length, MAX_BUFFER_SIZE));
  const text = sampleBytes.toString('utf8').toLowerCase();
  const hasSignature = WINAUDIT_SIGNATURES.some((sig) => text.includes(sig));
  if (hasSignature) return true;

  const nome = (originalName || '').toLowerCase();
  return nome.includes('winaudit') && text.includes('computer name');
};

const obterTodosOsNiveisDeTexto = (node) => {
  return node.querySelectorAll('*').map((n) => {
    const tag = (n.tagName || '').toLowerCase();
    const rawText = n.textContent ?? '';
    return { tag, rawText, text: limparAssinatura(rawText) };
  });
};

const extrairLinhasTabela = (table) => {
  const rows = table.querySelectorAll('tr');
  const linhas = [];
  rows.forEach((row) => {
    const celulas = row.querySelectorAll('th,td').map((c) => limparAssinatura(c.textContent ?? ''));
    const limpas = celulas.filter((c) => c.length > 0);
    if (limpas.length > 0) {
      linhas.push({ celulas, limpas });
    }
  });
  return linhas;
};

export const parseWinAuditHtml = (buffer, originalName) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return {
      valido: false,
      erro: 'Arquivo vazio ou corrompido.',
      tabelas: [],
      textos: [],
    };
  }

  if (!assinaturaPresenteNoBuffer(buffer, originalName)) {
    return {
      valido: false,
      erro: 'Não foi possível identificar um relatório válido do WinAudit. Verifique o arquivo selecionado.',
      tabelas: [],
      textos: [],
    };
  }

  let root;
  try {
    const options = {
      script: false,
      style: false,
      comment: false,
      pre: true,
      fixNestedATags: false,
      lowerCaseTagName: true,
      blockTextElements: {
        script: false,
        noscript: false,
        style: false,
        pre: true,
      },
    };
    root = parse(buffer.toString('utf8'), options);
  } catch (error) {
    return {
      valido: false,
      erro: 'Não foi possível processar o arquivo. Gere novamente o relatório no WinAudit e tente outra vez.',
      tabelas: [],
      textos: [],
    };
  }

  root.querySelectorAll('script, style, link, iframe, object, embed').forEach((n) => {
    try {
      n.parentNode?.removeChild?.(n);
    } catch {
      /* ignore */
    }
  });

  const tabelas = root.querySelectorAll('table').map((table) => extrairLinhasTabela(table)).filter((t) => t && t.length > 0);
  const textos = obterTodosOsNiveisDeTexto(root).filter((n) => n.text && n.text.length > 0);

  return {
    valido: true,
    erro: null,
    tabelas,
    textos,
  };
};
