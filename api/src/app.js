import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { errorHandler, notFoundRoute } from './lib/errors.js';
import { requireAuth } from './middleware/auth.js';
import { originCheck } from './middleware/origin-check.js';
import { applicationRoutes } from './routes/applications.routes.js';
import { authRoutes, publicAuthRoutes } from './routes/auth.routes.js';
import { copilotRoutes } from './routes/copilot.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { jobRoutes } from './routes/jobs.routes.js';

// Builds the Express app (server.js starts it; tests use it directly).
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // credentials: true lets the browser send our auth cookies cross-port (3000 -> 4000).
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(originCheck);

  // Public
  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use(publicAuthRoutes);

  // Everything below needs a signed-in recruiter
  app.use(requireAuth);
  app.use(authRoutes);
  app.use(dashboardRoutes);
  app.use(jobRoutes);
  app.use(applicationRoutes);
  app.use(copilotRoutes);

  app.use(notFoundRoute);
  app.use(errorHandler);
  return app;
}
