import crypto from 'node:crypto';

// Helpers base64url (sem padding)
const base64urlEncode = (buf) =>
  Buffer.from(buf).toString('base64').replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_');
const base64urlDecode = (str) =>
  Buffer.from(str.replaceAll('-', '+').replaceAll('_', '/'), 'base64');

const getSecret = () => process.env.CSRF_SECRET || process.env.JWT_SECRET || 'change-me';
const getTtlSeconds = () => Number.parseInt(process.env.CSRF_TTL_SECONDS || '1800', 10); // 30min

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
    const err = { statusCode: 403, code: 'EBADCSRFTOKEN', message: 'CSRF token inválido ou ausente', details: { reason: 'missing', userId: req.usuario?.id ?? null, header: null, hasToken: false, method } };
    return next(err);
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    let hdr;
    if (req.headers['x-csrf-token']) {
      hdr = 'x-csrf-token';
    } else if (req.headers['x-xsrf-token']) {
      hdr = 'x-xsrf-token';
    } else {
      hdr = null;
    }
    const err = { statusCode: 403, code: 'EBADCSRFTOKEN', message: 'Formato de CSRF token inválido', details: { reason: 'bad_format', userId: req.usuario?.id ?? null, header: hdr, hasToken: true, method } };
    return next(err);
  }

  try {
    let payloadJson;
    try {
      payloadJson = base64urlDecode(parts[0]).toString('utf8');
    } catch (error) {
      let hdr;
      if (req.headers['x-csrf-token']) {
        hdr = 'x-csrf-token';
      } else if (req.headers['x-xsrf-token']) {
        hdr = 'x-xsrf-token';
      } else {
        hdr = null;
      }
      const err = { statusCode: 403, code: 'EBADCSRFTOKEN', message: 'CSRF token inválido', details: { reason: 'invalid', userId: req.usuario?.id ?? null, header: hdr, hasToken: true, method, parseErrorCode: 'BASE64_DECODE_ERROR', parsePart: 'payload', parseError: typeof error?.message === 'string' ? error.message : String(error) } };
      return next(err);
    }

    let sigProvided;
    try {
      sigProvided = base64urlDecode(parts[1]);
    } catch (error) {
      let hdr;
      if (req.headers['x-csrf-token']) {
        hdr = 'x-csrf-token';
      } else if (req.headers['x-xsrf-token']) {
        hdr = 'x-xsrf-token';
      } else {
        hdr = null;
      }
      const err = { statusCode: 403, code: 'EBADCSRFTOKEN', message: 'CSRF token inválido', details: { reason: 'invalid', userId: req.usuario?.id ?? null, header: hdr, hasToken: true, method, parseErrorCode: 'BASE64_DECODE_ERROR', parsePart: 'signature', parseError: typeof error?.message === 'string' ? error.message : String(error) } };
      return next(err);
    }

    const secret = getSecret();
    const sigExpected = sign(payloadJson, secret);

    // Comparação segura
    if (sigProvided.length !== sigExpected.length || !crypto.timingSafeEqual(sigProvided, sigExpected)) {
      let hdr;
      if (req.headers['x-csrf-token']) {
        hdr = 'x-csrf-token';
      } else if (req.headers['x-xsrf-token']) {
        hdr = 'x-xsrf-token';
      } else {
        hdr = null;
      }
      const err = { statusCode: 403, code: 'EBADCSRFTOKEN', message: 'Assinatura do CSRF token inválida', details: { reason: 'bad_signature', userId: req.usuario?.id ?? null, header: hdr, hasToken: true, method } };
      return next(err);
    }

    let payload;
    try {
      payload = JSON.parse(payloadJson);
    } catch (error) {
      let hdr;
      if (req.headers['x-csrf-token']) {
        hdr = 'x-csrf-token';
      } else if (req.headers['x-xsrf-token']) {
        hdr = 'x-xsrf-token';
      } else {
        hdr = null;
      }
      const err = { statusCode: 403, code: 'EBADCSRFTOKEN', message: 'CSRF token inválido', details: { reason: 'invalid', userId: req.usuario?.id ?? null, header: hdr, hasToken: true, method, parseErrorCode: 'JSON_PARSE_ERROR', parsePart: 'payload', parseError: typeof error?.message === 'string' ? error.message : String(error) } };
      return next(err);
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload.uid || String(payload.uid) !== String(req.usuario.id)) {
      let hdr;
      if (req.headers['x-csrf-token']) {
        hdr = 'x-csrf-token';
      } else if (req.headers['x-xsrf-token']) {
        hdr = 'x-xsrf-token';
      } else {
        hdr = null;
      }
      const err = { statusCode: 403, code: 'EBADCSRFTOKEN', message: 'CSRF token não corresponde ao usuário', details: { reason: 'uid_mismatch', userId: req.usuario?.id ?? null, header: hdr, hasToken: true, method } };
      return next(err);
    }
    if (typeof payload.exp !== 'number' || nowSec > payload.exp) {
      let hdr;
      if (req.headers['x-csrf-token']) {
        hdr = 'x-csrf-token';
      } else if (req.headers['x-xsrf-token']) {
        hdr = 'x-xsrf-token';
      } else {
        hdr = null;
      }
      const err = { statusCode: 403, code: 'EBADCSRFTOKEN', message: 'CSRF token expirado', details: { reason: 'expired', userId: req.usuario?.id ?? null, header: hdr, hasToken: true, method } };
      return next(err);
    }

    // Token válido
    return next();
  } catch (error) {
    let hdr;
    if (req.headers['x-csrf-token']) {
      hdr = 'x-csrf-token';
    } else if (req.headers['x-xsrf-token']) {
      hdr = 'x-xsrf-token';
    } else {
      hdr = null;
    }
    const err = { statusCode: 403, code: 'EBADCSRFTOKEN', message: 'CSRF token inválido', details: { reason: 'invalid', userId: req.usuario?.id ?? null, header: hdr, hasToken: true, method, parseErrorCode: 'UNEXPECTED_ERROR', parseError: typeof error?.message === 'string' ? error.message : String(error) } };
    return next(err);
  }
};
