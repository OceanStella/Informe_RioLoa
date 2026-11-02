export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

export function serializeCookie(
  name: string,
  value: string,
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Lax' | 'Strict' | 'None';
    path?: string;
    maxAge?: number;
  },
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  parts.push(`Path=${options.path ?? '/'}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join('; ');
}

export function shouldUseSecureCookie(): boolean {
  return Boolean(process.env.K_SERVICE);
}

export const ADMIN_COOKIE_NAME = 'admin_session';
export const ADMIN_SESSION_MAX_AGE_SECONDS = 6 * 60 * 60;

export const USER_COOKIE_NAME = 'user_session';
export const USER_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

export const AUTH_FLOW_COOKIE_NAME = 'auth_flow';
export const AUTH_FLOW_MAX_AGE_SECONDS = 10 * 60;

export const MVP_ACCESS_COOKIE_NAME = 'mvp_access';
export const MVP_ACCESS_MAX_AGE_SECONDS = 12 * 60 * 60;
