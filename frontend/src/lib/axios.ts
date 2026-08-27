import axios from 'axios';
import { getAuthToken, getApiBaseUrl } from '../services/auth';
import { showErrorToast } from '../utils/toast';

const api = axios.create();

const WRITE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

let sessaoExpiradaDisparada = false;

const dispararExpiracaoSessao = () => {
  if (sessaoExpiradaDisparada) return;
  sessaoExpiradaDisparada = true;
  try {
    showErrorToast('Sessão expirada. Faça login novamente.');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEscolaNome');
  } catch (err) {
    console.warn('Erro ao processar expiração de sessão', err);
  }
  if (globalThis.window !== undefined && globalThis.window.location.pathname !== '/login') {
    globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(() => {
        globalThis.location.href = '/login';
      });
    });
  }
};

api.interceptors.request.use(async (config) => {
  const base = getApiBaseUrl();
  // Normaliza base e URL para evitar duplicação de "/api"
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
  if (token) {
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const method = (config.method || 'get').toLowerCase();
  // CSRF token só pode ser emitido para usuários autenticados
  if (WRITE_METHODS.has(method) && token) {
    try {
      const csrfPath = baseNorm.endsWith('/api') ? `${baseNorm}/csrf-token` : `${baseNorm}/api/csrf-token`;
      const csrfResp = await axios.get(csrfPath, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const csrfToken = csrfResp.data?.csrfToken || csrfResp.data;
      if (csrfToken) {
        (config.headers as Record<string, string>)['X-CSRF-Token'] = csrfToken;
      }
    } catch {
      // Se falhar ao obter CSRF, deixe seguir; backend retornará 403
      // Opcional: podemos lançar para bloquear requisição
    }
  }

  return config;
});

// Interceptor de respostas: redireciona ao login quando a sessão expira
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      dispararExpiracaoSessao();
    } else if (status === 403) {
      // Não desloga em 403; apenas informa falta de permissão
      showErrorToast('Sem permissão para executar esta ação.');
    }
    return Promise.reject(error);
  }
);

export default api;