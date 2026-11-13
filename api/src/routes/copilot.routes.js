import { Router } from 'express';
import { validate } from '../lib/validate.js';
import { copilotSchema } from '../schemas.js';
import { askCopilot } from '../services/copilot.service.js';

export const copilotRoutes = Router();

// Ask the assistant about this job. Returns { answer, pendingActions }.
copilotRoutes.post('/jobs/:jobId/copilot', async (req, res) => {
  const input = validate(copilotSchema, req.body);
  res.json(await askCopilot(req.params.jobId, input));
});
