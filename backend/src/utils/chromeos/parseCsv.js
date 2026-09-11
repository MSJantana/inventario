const BOM_UTF8 = '\uFEFF';
const BOM_CODE_POINT = BOM_UTF8.codePointAt(0) || 0xFEFF;

const stripBom = (texto) => {
  if (typeof texto !== 'string') return '';
  if (texto.length > 0 && texto.codePointAt(0) === BOM_CODE_POINT) {
    return texto.slice(1);
  }
  return texto;
};

const bufferParaString = (buf) => {
  if (buf === null || buf === undefined) return '';
  if (typeof buf === 'string') return buf;
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    return decoder.decode(buf);
  } catch {
    try {
      return buf.toString('utf-8');
    } catch {
      return '';
    }
  }
};

export const parseChromeOsCsv = (buffer, originalName) => {
  const entrada = {
    valido: false,
    erro: null,
    colunas: [],
    linhas: [],
    arquivoOriginal: typeof originalName === 'string' ? originalName : '',
  };

  if (buffer === null || buffer === undefined) {
    entrada.erro = 'Arquivo vazio ou ausente.';
    return entrada;
  }

  const raw = stripBom(bufferParaString(buffer));
  if (!raw || raw.trim().length === 0) {
    entrada.erro = 'CSV sem conteúdo.';
    return entrada;
  }

  const ESTADO = {
    FIELD_START: 'FIELD_START',
    FIELD_NORMAL: 'FIELD_NORMAL',
    FIELD_QUOTED: 'FIELD_QUOTED',
    FIELD_QUOTED_AFTER_QUOTE: 'FIELD_QUOTED_AFTER_QUOTE',
  };

  let estado = ESTADO.FIELD_START;
  let linhaAtual = [];
  let campoAtual = '';
  const todasLinhas = [];
  let abriuAspas = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw.charAt(i);

    switch (estado) {
      case ESTADO.FIELD_START:
        if (ch === '"') {
          estado = ESTADO.FIELD_QUOTED;
          abriuAspas = true;
          campoAtual = '';
        } else if (ch === ',') {
          linhaAtual.push('');
          estado = ESTADO.FIELD_START;
        } else if (ch === '\r') {
          estado = ESTADO.FIELD_START;
        } else if (ch === '\n') {
          todasLinhas.push(linhaAtual);
          linhaAtual = [];
          estado = ESTADO.FIELD_START;
        } else {
          campoAtual = ch;
          estado = ESTADO.FIELD_NORMAL;
        }
        break;

      case ESTADO.FIELD_NORMAL:
        if (ch === ',') {
          linhaAtual.push(campoAtual);
          campoAtual = '';
          estado = ESTADO.FIELD_START;
        } else if (ch === '\r') {
          estado = ESTADO.FIELD_NORMAL;
        } else if (ch === '\n') {
          linhaAtual.push(campoAtual);
          todasLinhas.push(linhaAtual);
          linhaAtual = [];
          campoAtual = '';
          estado = ESTADO.FIELD_START;
        } else {
          campoAtual += ch;
        }
        break;

      case ESTADO.FIELD_QUOTED:
        if (ch === '"') {
          estado = ESTADO.FIELD_QUOTED_AFTER_QUOTE;
        } else {
          campoAtual += ch;
        }
        break;

      case ESTADO.FIELD_QUOTED_AFTER_QUOTE:
        if (ch === '"') {
          campoAtual += '"';
          estado = ESTADO.FIELD_QUOTED;
        } else if (ch === ',') {
          linhaAtual.push(campoAtual);
          campoAtual = '';
          estado = ESTADO.FIELD_START;
        } else if (ch === '\r') {
          estado = ESTADO.FIELD_QUOTED_AFTER_QUOTE;
        } else if (ch === '\n') {
          linhaAtual.push(campoAtual);
          todasLinhas.push(linhaAtual);
          linhaAtual = [];
          campoAtual = '';
          estado = ESTADO.FIELD_START;
        } else {
          campoAtual += ch;
          estado = ESTADO.FIELD_NORMAL;
        }
        break;

      default:
        break;
    }
  }

  if (estado === ESTADO.FIELD_QUOTED && abriuAspas) {
    entrada.erro = 'CSV com aspas não fechadas.';
    return entrada;
  }

  if (campoAtual.length > 0 || estado !== ESTADO.FIELD_START || linhaAtual.length > 0) {
    linhaAtual.push(campoAtual);
    todasLinhas.push(linhaAtual);
  }

  const linhasValidas = todasLinhas.filter((l) => l.some((c) => typeof c === 'string' && c.trim() !== ''));
  if (linhasValidas.length === 0) {
    entrada.erro = 'CSV sem linhas válidas.';
    return entrada;
  }

  const cabecalho = linhasValidas[0];
  const colunasLimpas = cabecalho.map((c) => (typeof c === 'string' ? c.trim() : ''));
  if (colunasLimpas.length === 0) {
    entrada.erro = 'CSV sem cabeçalho.';
    return entrada;
  }

  const saida = [];
  for (let r = 1; r < linhasValidas.length; r += 1) {
    const linha = linhasValidas[r];
    const obj = {};
    for (let c = 0; c < colunasLimpas.length; c += 1) {
      const chave = colunasLimpas[c];
      if (!chave) continue;
      const valor = linha[c] ?? '';
      obj[chave] = typeof valor === 'string' ? valor : String(valor ?? '');
    }
    saida.push(obj);
  }

  entrada.colunas = colunasLimpas.filter(Boolean);
  entrada.linhas = saida;
  entrada.valido = true;
  return entrada;
};

export default parseChromeOsCsv;
