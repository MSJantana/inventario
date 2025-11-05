// Middleware para validação de dados
import { normalizeToCiscoMac, isValidMacCisco, sanitizeMac } from '../utils/mac.js';

// Validação para equipamentos
export const validarEquipamento = (req, res, next) => {
  const method = req.method;
  const { nome, tipo, modelo, serial, dataAquisicao } = req.body;

  // Normalização/validação de MAC (se enviado)
  if (typeof req.body.macadress !== 'undefined') {
    const sanitized = sanitizeMac(req.body.macadress);
    if (sanitized.length === 0) {
      return res.status(400).json({ error: 'MAC Address inválido ou vazio.' });
    }
    if (sanitized.length !== 12) {
      return res.status(400).json({ error: 'MAC Address deve conter 12 dígitos hexadecimais.' });
    }
    const normalized = normalizeToCiscoMac(req.body.macadress);
    if (!normalized || !isValidMacCisco(normalized)) {
      return res.status(400).json({ error: 'MAC Address inválido. Use 12 dígitos hex (ex: AAAA.BBBB.CCCC).' });
    }
    // Substitui pelo formato normalizado
    req.body.macadress = normalized;
  }

  if (method === 'POST') {
    if (!nome || !tipo || !modelo || !serial || !dataAquisicao) {
      return res.status(400).json({
        error: 'Dados incompletos. Nome, tipo, modelo, serial e data de aquisição são obrigatórios.'
      });
    }
  }

  if (method === 'PUT') {
    // TECNICO só pode atualizar parcialmente: status, localizacao, observacoes
    if (req.usuario?.role === 'TECNICO') {
      const camposPermitidos = ['status', 'localizacao', 'observacoes'];
      const chaves = Object.keys(req.body);
      if (chaves.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar foi enviado' });
      }
      const invalidos = chaves.filter((k) => !camposPermitidos.includes(k));
      if (invalidos.length > 0) {
        return res.status(400).json({ error: 'TECNICO só pode atualizar status, localizacao e observacoes' });
      }
    }
  }

  next();
};

// Validação para usuários
export const validarUsuario = (req, res, next) => {
  const { nome, email, senha } = req.body;
  
  if (!nome || !email || !senha) {
    return res.status(400).json({ 
      error: 'Dados incompletos. Nome, email e senha são obrigatórios.' 
    });
  }
  
  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Formato de email inválido.' });
  }
  
  next();
};

// Validação para movimentações
export const validarMovimentacao = (req, res, next) => {
  // Aceitar aliases e normalizar campos para o controller
  const tipoAliased = req.body.tipo ?? req.body.tipoMovimento;
  const dataAliased = req.body.data ?? req.body.dataMovimento;
  const descricaoAliased = req.body.descricao ?? req.body.observacoes;

  // Aviso de depreciação quando campos antigos forem usados
  const deprecatedFields = [];
  if (req.body.tipo !== undefined && req.body.tipoMovimento === undefined) {
    deprecatedFields.push('tipo->tipoMovimento');
  }
  if (req.body.data !== undefined && req.body.dataMovimento === undefined) {
    deprecatedFields.push('data->dataMovimento');
  }
  if (req.body.descricao !== undefined && req.body.observacoes === undefined) {
    deprecatedFields.push('descricao->observacoes');
  }
  if (deprecatedFields.length > 0) {
    const msg = `Campos antigos usados (${deprecatedFields.join(', ')}). Utilize tipoMovimento, dataMovimento e observacoes. Aliases serão removidos futuramente.`;
    try {
      res.setHeader('Deprecation', 'true');
      res.setHeader('X-Deprecation-Warning', msg);
    } catch (_) {}
    if (req.log && typeof req.log.warn === 'function') {
      req.log.warn({ requestId: req.id, deprecatedFields }, 'Deprecated alias fields used in request');
    }
  }

  if (tipoAliased !== undefined) req.body.tipo = tipoAliased;
  if (dataAliased !== undefined) req.body.data = dataAliased;
  if (descricaoAliased !== undefined) req.body.descricao = descricaoAliased;

  const { equipamentoId, tipo, data } = req.body;

  if (!equipamentoId || !tipo || !data) {
    return res.status(400).json({ 
      error: 'Dados incompletos. ID do equipamento, tipo e data são obrigatórios.' 
    });
  }
  
  // Validar tipo de movimentação
  const tiposValidos = ['ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'MANUTENCAO', 'DESCARTE'];
  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({ 
      error: `Tipo de movimentação inválido. Valores aceitos: ${tiposValidos.join(', ')}` 
    });
  }

  // Validar data ISO
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) {
    return res.status(400).json({
      error: 'Data inválida. Use ISO 8601, ex: 2025-11-05T10:00:00Z'
    });
  }
  
  next();
};

// Validação para escolas
export const validarEscola = (req, res, next) => {
  const { nome, endereco, cidade, estado, cep } = req.body;
  
  if (!nome || !endereco || !cidade || !estado || !cep) {
    return res.status(400).json({ 
      error: 'Dados incompletos. Nome, endereço, cidade, estado e CEP são obrigatórios.' 
    });
  }
  
  // Validar formato de CEP (00000-000)
  const cepRegex = /^\d{5}-\d{3}$/;
  if (!cepRegex.test(cep)) {
    return res.status(400).json({ error: 'Formato de CEP inválido. Use o formato 00000-000.' });
  }
  
  next();
};