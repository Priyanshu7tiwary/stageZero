import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { errorHandler, notFoundRoute } from './lib/errors.js';
import { applicationRoutes } from './routes/applications.routes.js';
import { copilotRoutes } from './routes/copilot.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { jobRoutes } from './routes/jobs.routes.js';

// Builds the Express app (server.js starts it; tests use it directly).
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use(dashboardRoutes);
  app.use(jobRoutes);
  app.use(applicationRoutes);
  app.use(copilotRoutes);

  app.use(notFoundRoute);
  app.use(errorHandler);
  return app;
}
