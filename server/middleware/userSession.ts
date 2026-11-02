import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getAuthSessionSecret, isAuthEnabled } from '../config/authConfig.js';
import {
  USER_COOKIE_NAME,
  USER_SESSION_MAX_AGE_SECONDS,
  parseCookies,
  serializeCookie,
  shouldUseSecureCookie,
} from '../utils/cookies.js';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
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

export function setUserCookie(res: Response, user: SessionUser): void {
  const secret = getAuthSessionSecret();
  if (!secret) throw new Error('AUTH_SESSION_SECRET is not configured');
  const token = jwt.sign({ email: user.email, name: user.displayName }, secret, {
    subject: user.id,
    expiresIn: USER_SESSION_MAX_AGE_SECONDS,
  });
  res.append('Set-Cookie', serializeCookie(USER_COOKIE_NAME, token, cookieOptions(USER_SESSION_MAX_AGE_SECONDS)));
}

export function clearUserCookie(res: Response): void {
  res.append('Set-Cookie', serializeCookie(USER_COOKIE_NAME, '', cookieOptions(0)));
}

export function readSessionUser(req: Request): SessionUser | null {
  const secret = getAuthSessionSecret();
  const token = parseCookies(req.headers.cookie)[USER_COOKIE_NAME];
  if (!secret || !token) return null;
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof payload !== 'object' || !payload.sub || typeof payload.email !== 'string') return null;
    return { id: payload.sub, email: payload.email, displayName: typeof payload.name === 'string' ? payload.name : '' };
  } catch {
    return null;
  }
}

/** With AUTH_ENABLED=false every route stays open, as the app worked before Entra. */
export function requireUser(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthEnabled()) {
    res.locals.user = null;
    next();
    return;
  }
  const user = readSessionUser(req);
  if (!user) {
    res.status(401).json({ ok: false, message: 'Debes iniciar sesión.' });
    return;
  }
  res.locals.user = user;
  next();
}

export function currentUser(res: Response): SessionUser | null {
  return (res.locals.user as SessionUser | null | undefined) ?? null;
}
