import { Router } from 'express';
import { dashboardStats } from '../services/dashboard.service.js';

export const dashboardRoutes = Router();

dashboardRoutes.get('/dashboard', async (req, res) => {
  res.json(await dashboardStats());
});
