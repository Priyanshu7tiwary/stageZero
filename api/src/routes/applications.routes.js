import { Router } from 'express';
import { validate } from '../lib/validate.js';
import { addCandidateSchema, listApplicationsSchema, moveStageSchema } from '../schemas.js';
import { addCandidate, listApplications, moveStage } from '../services/applications.service.js';

export const applicationRoutes = Router();

// ?stage=INTERVIEW&search=priya
applicationRoutes.get('/jobs/:jobId/applications', async (req, res) => {
  const filters = validate(listApplicationsSchema, req.query);
  res.json(await listApplications(req.params.jobId, filters));
});

applicationRoutes.post('/jobs/:jobId/applications', async (req, res) => {
  const input = validate(addCandidateSchema, req.body);
  res.status(201).json(await addCandidate(req.params.jobId, input));
});

applicationRoutes.patch('/applications/:applicationId/stage', async (req, res) => {
  const { stage } = validate(moveStageSchema, req.body);
  res.json(await moveStage(req.params.applicationId, stage));
});
