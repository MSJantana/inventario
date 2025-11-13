export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

export function setAuthToken(token: string) {
  localStorage.setItem('authToken', token);
}

function isLocalhostUrl(u: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(u.trim());
}

export function getApiBaseUrl(): string {
  const ls = (localStorage.getItem('apiBaseUrl') || '').trim();
  const envVal = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '';

  if (import.meta.env.DEV) {
    // DEV: permite override e fallback para localhost
    return ls || envVal || 'http://localhost:3002';
  }

  // PROD: nunca usar localhost
  if (ls && !isLocalhostUrl(ls)) return ls;
  if (envVal && !isLocalhostUrl(envVal)) return envVal;

  // padrão seguro atrás do Nginx
  return '/api';
}

export function setApiBaseUrl(url: string) {
  const v = url.trim();
  if (!import.meta.env.DEV && isLocalhostUrl(v)) {
    // Em produção, ignore set com localhost
    return;
  }
  localStorage.setItem('apiBaseUrl', v);
}
