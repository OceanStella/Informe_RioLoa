import { Router, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { getAuthSessionSecret, getEntraConfig, isAuthEnabled } from '../config/authConfig.js';
import { clearAdminCookie } from '../middleware/adminAuth.js';
import { clearUserCookie, readSessionUser, setUserCookie } from '../middleware/userSession.js';
import { upsertUser } from '../repositories/usersRepository.js';
import {
  buildAuthorizationRequest,
  buildLogoutUrl,
  exchangeCodeForIdentity,
  type AuthFlowState,
} from '../services/entraAuthService.js';
import {
  AUTH_FLOW_COOKIE_NAME,
  AUTH_FLOW_MAX_AGE_SECONDS,
  parseCookies,
  serializeCookie,
  shouldUseSecureCookie,
} from '../utils/cookies.js';

const router = Router();

const LOGIN_FAILED_REDIRECT = '/?authError=1';

/** Only same-origin paths: blocks open redirects such as //evil.example or /\evil.example. */
export function sanitizeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !/^\/(?![/\\])/.test(value) || value.includes('\\')) return '/';
  try {
    const base = 'http://return-to.invalid';
    const url = new URL(value, base);
    return url.origin === base ? `${url.pathname}${url.search}` : '/';
  } catch {
    return '/';
  }
}

function setAuthFlowCookie(res: Response, value: string, maxAge: number): void {
  res.append(
    'Set-Cookie',
    serializeCookie(AUTH_FLOW_COOKIE_NAME, value, {
      httpOnly: true,
      secure: shouldUseSecureCookie(),
      sameSite: 'Lax',
      path: '/api/auth',
      maxAge,
    }),
  );
}

function readAuthFlow(cookieHeader: string | undefined, secret: string): AuthFlowState | null {
  const token = parseCookies(cookieHeader)[AUTH_FLOW_COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, secret, { algorithms: ['HS256'] }) as unknown as AuthFlowState;
  } catch {
    return null;
  }
}

router.get('/login', async (req, res) => {
  if (!isAuthEnabled()) return res.redirect('/');

  const config = getEntraConfig();
  const secret = getAuthSessionSecret();
  if (!config || !secret) {
    return res.status(503).json({ ok: false, message: 'El inicio de sesión no está configurado.' });
  }

  try {
    const { authorizationUrl, flow } = await buildAuthorizationRequest(config, sanitizeReturnTo(req.query.returnTo));
    setAuthFlowCookie(res, jwt.sign(flow, secret, { expiresIn: AUTH_FLOW_MAX_AGE_SECONDS }), AUTH_FLOW_MAX_AGE_SECONDS);
    return res.redirect(authorizationUrl);
  } catch (error) {
    console.error('Failed to start login:', error instanceof Error ? error.message : error);
    return res.redirect(LOGIN_FAILED_REDIRECT);
  }
});

router.get('/callback', async (req, res) => {
  const config = getEntraConfig();
  const secret = getAuthSessionSecret();
  if (!isAuthEnabled() || !config || !secret) return res.redirect('/');

  const flow = readAuthFlow(req.headers.cookie, secret);
  setAuthFlowCookie(res, '', 0);

  const { code, state } = req.query;
  if (!flow || typeof code !== 'string' || state !== flow.state) {
    return res.redirect(LOGIN_FAILED_REDIRECT);
  }

  try {
    const identity = await exchangeCodeForIdentity(config, code, flow);
    if (!identity) {
      console.error('Login rejected: token without a valid identity');
      return res.redirect(LOGIN_FAILED_REDIRECT);
    }
    await upsertUser(identity);
    setUserCookie(res, { id: identity.externalId, email: identity.email, displayName: identity.displayName });
    return res.redirect(flow.returnTo);
  } catch (error) {
    console.error('Login failed:', error instanceof Error ? error.message : error);
    return res.redirect(LOGIN_FAILED_REDIRECT);
  }
});

router.post('/logout', (_req, res) => {
  clearUserCookie(res);
  clearAdminCookie(res);
  const config = getEntraConfig();
  return res.json({ ok: true, logoutUrl: config ? buildLogoutUrl(config) : '/' });
});

router.get('/me', (req, res) => {
  const authEnabled = isAuthEnabled();
  const user = authEnabled ? readSessionUser(req) : null;
  return res.json(user ? { authenticated: true, authEnabled, user } : { authenticated: false, authEnabled });
});

export default router;
