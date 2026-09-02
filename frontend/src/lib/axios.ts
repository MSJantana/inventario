import axios, { AxiosError } from 'axios';
import { getAuthToken, getApiBaseUrl, isTokenExpired, setSessionExpiredFlag } from '../services/auth';
import { showErrorToast } from '../utils/toast';

const api = axios.create();

const WRITE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

let sessaoExpiradaDisparada = false;

export const resetSessionExpiredFlag = () => {
  sessaoExpiradaDisparada = false;
};

const dispararExpiracaoSessao = () => {
  if (sessaoExpiradaDisparada) return;
  sessaoExpiradaDisparada = true;
  try {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEscolaNome');
  } catch (err) {
    console.warn('Erro ao limpar storage na expiração de sessão', err);
  }
  try {
    setSessionExpiredFlag();
  } catch {
    /* ignore */
  }
  if (typeof globalThis.dispatchEvent === 'function' && typeof globalThis.CustomEvent === 'function') {
    try {
      globalThis.dispatchEvent(new globalThis.CustomEvent('auth:session-expired'));
    } catch (err) {
      console.warn('Erro ao disparar evento de expiração de sessão', err);
    }
  }
  if (globalThis.window !== undefined && globalThis.window.location.pathname !== '/login') {
    try {
      globalThis.window.location.replace('/login');
    } catch {
      try {
        globalThis.location.href = '/login';
      } catch {
        /* ignore */
      }
    }
  }
};

api.interceptors.request.use(async (config) => {
  const base = getApiBaseUrl();
  const baseStr = base || '';
  let baseNorm = baseStr;
  while (baseNorm.endsWith('/')) {
    baseNorm = baseNorm.slice(0, -1);
  }
  config.baseURL = baseNorm;
  if (typeof config.url === 'string' && baseNorm.endsWith('/api') && config.url.startsWith('/api/')) {
    config.url = config.url.replace(/^\/api\//, '/');
  }
  config.headers = config.headers || {};

  const token = getAuthToken();

  // Verificação LOCAL de expiração — SEM round-trip, sem esperar backend.
  // Elimina a demora quando sessão já expirou.
  if (token) {
    const check = isTokenExpired(token);
    if (check.expired) {
      const urlForLog = typeof config.url === 'string' ? config.url : '';
      const skipLoginPaths = ['/login', '/usuarios/login', '/usuarios/forgot-password', '/usuarios/reset-password'];
      const isAuthRoute = skipLoginPaths.some((p) => urlForLog.includes(p));
      if (!isAuthRoute) {
        dispararExpiracaoSessao();
        const err = new AxiosError(
          'Sessão expirada',
          'ERR_SESSION_EXPIRED',
          config,
          undefined,
          undefined
        );
        (err as { __sessionExpired?: boolean }).__sessionExpired = true;
        return Promise.reject(err);
      }
    }
  }

  if (token) {
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const method = (config.method || 'get').toLowerCase();
  // CSRF só faz sentido se tiver token válido e rota for não-idempotente.
  // Não fetch CSRF para rotas públicas de auth (login/senha) que não precisam.
  if (WRITE_METHODS.has(method) && token) {
    try {
      const csrfPath = baseNorm.endsWith('/api') ? `${baseNorm}/csrf-token` : `${baseNorm}/api/csrf-token`;
      const csrfResp = await axios.get(csrfPath, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        timeout: 6000,
      });
      const csrfToken = csrfResp.data?.csrfToken || csrfResp.data;
      if (csrfToken) {
        (config.headers as Record<string, string>)['X-CSRF-Token'] = csrfToken;
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        dispararExpiracaoSessao();
        const axErr = new AxiosError(
          'Sessão expirada (CSRF)',
          'ERR_SESSION_EXPIRED',
          config,
          undefined,
          undefined
        );
        (axErr as { __sessionExpired?: boolean }).__sessionExpired = true;
        return Promise.reject(axErr);
      }
      // Demais erros de CSRF deixamos seguir (o backend retorna 403).
    }
  }

  return config;
});

// Interceptor de respostas: redireciona ao login quando a sessão expira
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const alreadyHandled = Boolean((error as { __sessionExpired?: boolean }).__sessionExpired);
    if (alreadyHandled) {
      return Promise.reject(error);
    }
    const status = error?.response?.status;
    if (status === 401) {
      dispararExpiracaoSessao();
    } else if (status === 403) {
      showErrorToast('Sem permissão para executar esta ação.');
    }
    return Promise.reject(error);
  }
);

export default api;
