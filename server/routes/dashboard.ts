import { Router } from 'express';
import { listAllReports } from '../repositories/reportsRepository.js';
import { buildDashboardSummary } from '../services/dashboardService.js';

const router = Router();

router.get('/summary', async (_req, res) => {
  try {
    const summary = buildDashboardSummary(await listAllReports());
    return res.json({ ok: true, summary });
  } catch (error) {
    console.error('Failed to build dashboard summary:', error);
    return res.status(500).json({ ok: false, message: 'No fue posible cargar el dashboard.' });
  }
});

export default router;
