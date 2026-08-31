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
    return ls || envVal || 'http://localhost:3002';
  }

  if (ls && !isLocalhostUrl(ls)) return ls;
  if (envVal && !isLocalhostUrl(envVal)) return envVal;

  return '/api';
}

export function setApiBaseUrl(url: string) {
  const v = url.trim();
  if (!import.meta.env.DEV && isLocalhostUrl(v)) {
    return;
  }
  localStorage.setItem('apiBaseUrl', v);
}

function b64DecodeUnicode(str: string): string {
  const replaced = str.replaceAll('-', '+').replaceAll('_', '/');
  const padded = replaced.padEnd(replaced.length + ((4 - (replaced.length % 4)) % 4), '=');
  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
}

export function decodeJwtPayload<T extends Record<string, unknown> = Record<string, unknown>>(
  token: string | null | undefined
): T | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const json = b64DecodeUnicode(parts[1]);
    if (!json) return null;
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

const EXPIRY_GRACE_SECONDS = 5;

export function isTokenExpired(
  token: string | null | undefined,
  { graceSeconds = EXPIRY_GRACE_SECONDS }: { graceSeconds?: number } = {}
): { expired: boolean; expiresAtSec: number | null; secondsLeft: number | null } {
  const payload = decodeJwtPayload<{ exp?: number; iat?: number }>(token);
  const exp = typeof payload?.exp === 'number' ? payload.exp : null;
  if (exp == null) {
    return { expired: false, expiresAtSec: null, secondsLeft: null };
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const secondsLeft = exp - nowSec;
  return {
    expired: secondsLeft <= graceSeconds,
    expiresAtSec: exp,
    secondsLeft,
  };
}

const SESSION_EXPIRED_KEY = 'auth:session-expired-flag';

export function setSessionExpiredFlag(): void {
  try {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');
  } catch {
    /* ignore private mode / storage errors */
  }
}

export function consumeSessionExpiredFlag(): boolean {
  try {
    const val = sessionStorage.getItem(SESSION_EXPIRED_KEY);
    if (val) {
      sessionStorage.removeItem(SESSION_EXPIRED_KEY);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

