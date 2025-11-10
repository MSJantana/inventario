import axios from 'axios';
import { getAuthToken, getApiBaseUrl } from '../services/auth';
import { useAppStore } from '../store/useAppStore';
import { showErrorToast } from '../utils/toast';

const api = axios.create();

const WRITE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

api.interceptors.request.use(async (config) => {
  const base = getApiBaseUrl();
  // Normaliza base e URL para evitar duplicação de "/api"
  const baseNorm = (base || '').replace(/\/+$/, '');
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
  if (WRITE_METHODS.has(method)) {
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
    if (status === 401 || status === 403) {
      try {
        // Limpa dados de autenticação
        localStorage.removeItem('authToken');
        localStorage.removeItem('userName');
        // Atualiza store (Zustand)
        useAppStore.getState().setAuthTokenState('');
        // Feedback ao usuário
        showErrorToast('Sessão expirada. Faça login novamente.');
      } catch (err) {
        // Log mínimo para evitar bloco vazio e facilitar diagnóstico
        console.warn('Erro ao processar expiração de sessão', err);
      }
      // Redireciona para login
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;