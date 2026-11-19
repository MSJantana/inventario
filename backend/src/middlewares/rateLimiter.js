import rateLimit from 'express-rate-limit';

// Limite para tentativas de login (prevenção de brute force de senhas)
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,             // 10 tentativas por IP por minuto
  message: { error: 'Muitas tentativas de login. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limite para solicitações de recuperação de senha
// (prevenção de spam de e-mails e enumeração acelerada)
export const passwordRecoveryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,              // 5 tentativas por IP por minuto
  message: { error: 'Muitas solicitações de recuperação de senha. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});
