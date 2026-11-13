import { Router } from 'express';
import { validate } from '../lib/validate.js';
import { createJobSchema } from '../schemas.js';
import { createJob, getJob, listJobs } from '../services/jobs.service.js';

export const jobRoutes = Router();

jobRoutes.get('/jobs', async (req, res) => {
  res.json(await listJobs());
});

jobRoutes.post('/jobs', async (req, res) => {
  const input = validate(createJobSchema, req.body);
  res.status(201).json(await createJob(input));
});

jobRoutes.get('/jobs/:jobId', async (req, res) => {
  res.json(await getJob(req.params.jobId));
});
