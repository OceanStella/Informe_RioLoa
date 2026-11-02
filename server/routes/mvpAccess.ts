import { Router } from 'express';
import { getAuthSessionSecret, getMvpAccessCode, isMvpAccessRequired } from '../config/authConfig.js';
import {
  clearMvpAccessCookie,
  clearMvpLoginFailures,
  hasMvpAccess,
  isMvpLoginRateLimited,
  isValidMvpCode,
  recordMvpLoginFailure,
  setMvpAccessCookie,
} from '../middleware/mvpAccess.js';

const router = Router();

router.get('/status', (req, res) => {
  const required = isMvpAccessRequired();
  return res.json({ required, authenticated: required && hasMvpAccess(req) });
});

router.post('/login', (req, res) => {
  if (!isMvpAccessRequired()) {
    return res.status(404).json({ ok: false, message: 'El código de acceso no está activo.' });
  }
  if (!getMvpAccessCode() || !getAuthSessionSecret()) {
    console.error('MVP access gate: MVP_ACCESS_CODE or AUTH_SESSION_SECRET is missing');
    return res.status(503).json({ ok: false, message: 'El acceso no está configurado.' });
  }
  if (isMvpLoginRateLimited(req)) {
    return res.status(429).json({ ok: false, message: 'Demasiados intentos. Intenta más tarde.' });
  }
  if (!isValidMvpCode(req.body?.code)) {
    recordMvpLoginFailure(req);
    return res.status(401).json({ ok: false, message: 'Código incorrecto.' });
  }

  clearMvpLoginFailures(req);
  setMvpAccessCookie(res);
  return res.json({ ok: true });
});

router.post('/logout', (_req, res) => {
  clearMvpAccessCookie(res);
  return res.json({ ok: true });
});

export default router;
