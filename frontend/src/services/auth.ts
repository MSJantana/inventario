export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

export function setAuthToken(token: string) {
  localStorage.setItem('authToken', token);
}

export function getApiBaseUrl(): string {
  return (
    localStorage.getItem('apiBaseUrl') ||
    (import.meta.env.VITE_API_BASE_URL as string) ||
    'http://localhost:3002'
  );
}

export function setApiBaseUrl(url: string) {
  localStorage.setItem('apiBaseUrl', url);
}