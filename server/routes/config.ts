import { Router } from 'express';
import { loadConfig } from '../config/configStore.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const config = await loadConfig();
    return res.json({ ok: true, config });
  } catch (error) {
    console.error('Failed to read config:', error);
    return res.status(500).json({ ok: false, message: 'No fue posible cargar la configuración.' });
  }
});

export default router;
