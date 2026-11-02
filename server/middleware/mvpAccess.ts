import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getAuthSessionSecret, getMvpAccessCode, isMvpAccessRequired } from '../config/authConfig.js';
import {
  MVP_ACCESS_COOKIE_NAME,
  MVP_ACCESS_MAX_AGE_SECONDS,
  parseCookies,
  serializeCookie,
  shouldUseSecureCookie,
} from '../utils/cookies.js';

/**
 * Temporary shared gate for the MVP. It is not a user identity and it is not Admin: the signing
 * secret is shared with user_session, so the explicit scope keeps the tokens apart.
 */
const TOKEN_SCOPE = 'mvp-access';
const MAX_FAILED_LOGINS = 10;
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED_IPS = 10_000;

const failedLogins = new Map<string, number[]>();

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: 'Lax' as const,
    path: '/',
    maxAge,
  };
}

function sha256(value: string): Buffer {
  return crypto.createHash('sha256').update(value).digest();
}

/** Comparing digests keeps timingSafeEqual usable when the lengths differ. */
export function isValidMvpCode(candidate: unknown): boolean {
  const expected = getMvpAccessCode();
  if (!expected || typeof candidate !== 'string') return false;
  return crypto.timingSafeEqual(sha256(candidate.trim()), sha256(expected));
}

export function setMvpAccessCookie(res: Response): void {
  const secret = getAuthSessionSecret();
  if (!secret) throw new Error('AUTH_SESSION_SECRET is not configured');
  const token = jwt.sign({ scope: TOKEN_SCOPE }, secret, { expiresIn: MVP_ACCESS_MAX_AGE_SECONDS });
  res.append('Set-Cookie', serializeCookie(MVP_ACCESS_COOKIE_NAME, token, cookieOptions(MVP_ACCESS_MAX_AGE_SECONDS)));
}

export function clearMvpAccessCookie(res: Response): void {
  res.append('Set-Cookie', serializeCookie(MVP_ACCESS_COOKIE_NAME, '', cookieOptions(0)));
}

export function hasMvpAccess(req: Request): boolean {
  const secret = getAuthSessionSecret();
  const token = parseCookies(req.headers.cookie)[MVP_ACCESS_COOKIE_NAME];
  if (!secret || !token) return false;
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    return typeof payload === 'object' && payload.scope === TOKEN_SCOPE;
  } catch {
    return false;
  }
}

function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function recentFailures(ip: string): number[] {
  const threshold = Date.now() - FAILED_LOGIN_WINDOW_MS;
  return (failedLogins.get(ip) ?? []).filter((stamp) => stamp > threshold);
}

export function isMvpLoginRateLimited(req: Request): boolean {
  return recentFailures(clientIp(req)).length >= MAX_FAILED_LOGINS;
}

export function recordMvpLoginFailure(req: Request): void {
  if (failedLogins.size >= MAX_TRACKED_IPS) failedLogins.clear();
  const ip = clientIp(req);
  failedLogins.set(ip, [...recentFailures(ip), Date.now()]);
}

export function clearMvpLoginFailures(req: Request): void {
  failedLogins.delete(clientIp(req));
}

/** AUTH_ENABLED=true makes isMvpAccessRequired() false, so Entra alone guards the app then. */
export function requireMvpAccess(req: Request, res: Response, next: NextFunction): void {
  if (!isMvpAccessRequired() || hasMvpAccess(req)) {
    next();
    return;
  }
  res.status(401).json({ ok: false, code: 'MVP_ACCESS_REQUIRED', message: 'Ingresa el código de acceso.' });
}
