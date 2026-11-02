import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireMvpAccess } from './middleware/mvpAccess.js';
import { requireUser } from './middleware/userSession.js';
import adminRouter from './routes/admin.js';
import authRouter from './routes/auth.js';
import configRouter from './routes/config.js';
import dashboardRouter from './routes/dashboard.js';
import mvpAccessRouter from './routes/mvpAccess.js';
import reportsRouter from './routes/reports.js';
import reviewRouter from './routes/review.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  const distPath = path.join(__dirname, '../dist');

  app.use(express.json({ limit: '1mb' }));
  app.use('/api/auth', authRouter);
  app.use('/api/mvp-access', mvpAccessRouter);
  // The supervisor arrives from the email and does not know the MVP code: the token guards this route.
  app.use('/api/review', requireUser, reviewRouter);
  app.use('/api/reports', requireMvpAccess, requireUser, reportsRouter);
  app.use('/api/dashboard', requireMvpAccess, requireUser, dashboardRouter);
  app.use('/api/config', requireMvpAccess, requireUser, configRouter);
  app.use('/api/admin', requireMvpAccess, requireUser, adminRouter);
  app.use(express.static(distPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });

  return app;
}
