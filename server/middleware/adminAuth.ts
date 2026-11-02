import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  parseCookies,
  serializeCookie,
  shouldUseSecureCookie,
} from '../utils/cookies.js';

const loginAttempts = new Map<string, number[]>();

function getAdminPassword(): string | undefined {
  return process.env.ADMIN_PASSWORD?.trim() || undefined;
}

function getAdminSecret(): string | undefined {
  return process.env.ADMIN_SESSION_SECRET?.trim() || undefined;
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(getAdminPassword() && getAdminSecret());
}

export function logAdminAuthStatus(): void {
  if (isAdminAuthConfigured()) {
    console.log('Admin auth: configured');
    return;
  }
  console.warn('Admin auth: NOT configured - missing ADMIN_PASSWORD / ADMIN_SESSION_SECRET');
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: 'Lax' as const,
    path: '/',
    maxAge,
  };
}

export function createAdminSessionToken(): string {
  const secret = getAdminSecret();
  if (!secret) {
    throw new Error('Admin auth is not configured');
  }
  return jwt.sign({ role: 'admin' }, secret, { expiresIn: ADMIN_SESSION_MAX_AGE_SECONDS });
}

export function setAdminCookie(res: Response, token: string): void {
  res.setHeader('Set-Cookie', serializeCookie(ADMIN_COOKIE_NAME, token, cookieOptions(ADMIN_SESSION_MAX_AGE_SECONDS)));
}

export function clearAdminCookie(res: Response): void {
  res.append('Set-Cookie', serializeCookie(ADMIN_COOKIE_NAME, '', cookieOptions(0)));
}

export function verifyAdminToken(token: string | undefined): boolean {
  const secret = getAdminSecret();
  if (!secret || !token) return false;
  try {
    const payload = jwt.verify(token, secret);
    return typeof payload === 'object' && payload !== null && 'role' in payload && payload.role === 'admin';
  } catch {
    return false;
  }
}

export function readAdminToken(req: Request): string | undefined {
  return parseCookies(req.headers.cookie)[ADMIN_COOKIE_NAME];
}

export function isValidAdminPassword(password: unknown): boolean {
  const expected = getAdminPassword();
  return typeof password === 'string' && Boolean(expected) && password === expected;
}

export function isLoginRateLimited(req: Request): boolean {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const recent = (loginAttempts.get(ip) ?? []).filter((stamp) => now - stamp < windowMs);
  recent.push(now);
  loginAttempts.set(ip, recent);
  return recent.length > 20;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!verifyAdminToken(readAdminToken(req))) {
    res.status(401).json({ ok: false, message: 'No autorizado.' });
    return;
  }
  next();
}
