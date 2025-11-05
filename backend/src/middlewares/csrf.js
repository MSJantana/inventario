import crypto from 'crypto';

// Helpers base64url (sem padding)
const base64urlEncode = (buf) =>
  Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const base64urlDecode = (str) =>
  Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

const getSecret = () => process.env.CSRF_SECRET || process.env.JWT_SECRET || 'change-me';
const getTtlSeconds = () => parseInt(process.env.CSRF_TTL_SECONDS || '1800', 10); // 30min

// Assina payload com HMAC SHA256
const sign = (payloadStr, secret) => {
  return crypto.createHmac('sha256', secret).update(payloadStr).digest();
};

// Emite token CSRF atrelado ao usuário autenticado
export const issueCsrfToken = (req, res) => {
  const usuario = req.usuario;
  if (!usuario) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const ttl = getTtlSeconds();
  const payload = {
    uid: String(usuario.id),
    iat: nowSec,
    exp: nowSec + ttl,
    rnd: base64urlEncode(crypto.randomBytes(8)),
  };
  const payloadStr = JSON.stringify(payload);
  const secret = getSecret();
  const sig = sign(payloadStr, secret);
  const token = `${base64urlEncode(Buffer.from(payloadStr))}.${base64urlEncode(sig)}`;

  // Expor também TTL para cliente saber quando renovar
  res.json({ csrfToken: token, expiresIn: ttl });
};

// Middleware de proteção CSRF para métodos não-idempotentes
export const csrfProtect = (req, res, next) => {
  const method = req.method.toUpperCase();
  const unsafe = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  if (!unsafe) return next();

  // Requer usuário autenticado
  if (!req.usuario) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  const token = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
  if (!token || typeof token !== 'string') {
    const err = { statusCode: 403, code: 'EBADCSRFTOKEN', message: 'CSRF token inválido ou ausente' };
    return next(err);
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    const err = { statusCode: 403, code: 'EBADCSRFTOKEN', message: 'Formato de CSRF token inválido' };
    return next(err);
  }

  try {
    const payloadJson = base64urlDecode(parts[0]).toString('utf8');
    const sigProvided = base64urlDecode(parts[1]);
    const secret = getSecret();
    const sigExpected = sign(payloadJson, secret);

    // Comparação segura
    if (sigProvided.length !== sigExpected.length || !crypto.timingSafeEqual(sigProvided, sigExpected)) {
      const err = { statusCode: 403, code: 'EBADCSRFTOKEN', message: 'Assinatura do CSRF token inválida' };
      return next(err);
    }

    const payload = JSON.parse(payloadJson);
    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload.uid || String(payload.uid) !== String(req.usuario.id)) {
      const err = { statusCode: 403, code: 'EBADCSRFTOKEN', message: 'CSRF token não corresponde ao usuário' };
      return next(err);
    }
    if (typeof payload.exp !== 'number' || nowSec > payload.exp) {
      const err = { statusCode: 403, code: 'EBADCSRFTOKEN', message: 'CSRF token expirado' };
      return next(err);
    }

    // Token válido
    return next();
  } catch (_) {
    const err = { statusCode: 403, code: 'EBADCSRFTOKEN', message: 'CSRF token inválido' };
    return next(err);
  }
};