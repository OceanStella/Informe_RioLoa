import { Router } from 'express';
import { loadConfig, saveConfig } from '../config/configStore.js';
import { validateAppConfig } from '../config/validateConfig.js';
import {
  clearAdminCookie,
  createAdminSessionToken,
  isAdminAuthConfigured,
  isLoginRateLimited,
  isValidAdminPassword,
  readAdminToken,
  requireAdmin,
  setAdminCookie,
  verifyAdminToken,
} from '../middleware/adminAuth.js';

const router = Router();

router.post('/login', (req, res) => {
  if (isLoginRateLimited(req)) {
    return res.status(429).json({ ok: false, message: 'Demasiados intentos. Intenta más tarde.' });
  }
  if (!isAdminAuthConfigured()) {
    return res.status(500).json({ ok: false, message: 'La administración no está configurada.' });
  }
  if (!isValidAdminPassword(req.body?.password)) {
    return res.status(401).json({ ok: false, message: 'Contraseña incorrecta.' });
  }

  const token = createAdminSessionToken();
  setAdminCookie(res, token);
  return res.json({ ok: true });
});

router.get('/session', (req, res) => {
  const authenticated = verifyAdminToken(readAdminToken(req));
  return res.json({ ok: true, authenticated });
});

router.post('/logout', (_req, res) => {
  clearAdminCookie(res);
  return res.json({ ok: true });
});

router.put('/config', requireAdmin, async (req, res) => {
  const parsed = validateAppConfig(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ ok: false, message: parsed.message });
  }

  try {
    await saveConfig(parsed.config);
    return res.json({ ok: true, config: parsed.config });
  } catch (error) {
    console.error('Failed to save config:', error);
    return res.status(500).json({
      ok: false,
      message: 'No fue posible guardar la configuración.',
    });
  }
});

export default router;
