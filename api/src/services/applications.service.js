import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { dateToDay, isAcceptingApplications } from '../lib/dates.js';
import { conflict, notFound } from '../lib/errors.js';
import { canTransition, transitionError } from '../lib/stages.js';
import { applicationJson } from '../serializers.js';
import { findJobOr404 } from './jobs.service.js';

const withDetails = { candidate: true };

// A job's applications, optionally filtered by stage and searched by name.
export async function listApplications(jobId, { stage, search } = {}) {
  await findJobOr404(jobId); // 404 for an unknown job instead of an empty list
  const apps = await prisma.application.findMany({
    where: {
      jobId,
      stage,
      candidate: search ? { fullName: { contains: search, mode: 'insensitive' } } : undefined,
    },
    include: withDetails,
    orderBy: { createdAt: 'asc' },
  });
  return apps.map(applicationJson);
}

// Add a candidate to a job. A known email reuses the existing candidate.
// Refuses: closed jobs, jobs past their closing date, and applying twice.
export async function addCandidate(jobId, input) {
  const job = await findJobOr404(jobId);
  if (!isAcceptingApplications(job)) {
    throw job.status === 'CLOSED'
      ? conflict('JOB_CLOSED', 'This job is closed to new applications.')
      : conflict('APPLICATIONS_CLOSED', `Applications for this job closed on ${dateToDay(job.closingDate)}.`);
  }

  const { referred, ...profile } = input;
  try {
    // One transaction: if anything fails, nothing is saved.
    const app = await prisma.$transaction(async (tx) => {
      const existing = await tx.candidate.findUnique({ where: { email: profile.email } });

      if (existing) {
        const alreadyApplied = await tx.application.findUnique({
          where: { jobId_candidateId: { jobId, candidateId: existing.id } },
        });
        if (alreadyApplied) {
          throw conflict('ALREADY_APPLIED', `${existing.fullName} has already applied to this job.`);
        }
      }

      // Known email: keep their name, refresh contact details and profile.
      const candidate = existing
        ? await tx.candidate.update({
            where: { id: existing.id },
            data: { phone: profile.phone ?? existing.phone, skills: profile.skills, experienceYears: profile.experienceYears },
          })
        : await tx.candidate.create({ data: profile });

      return tx.application.create({ data: { jobId, candidateId: candidate.id, referred }, include: withDetails });
    });
    return applicationJson(app);
  } catch (err) {
    // Two requests at the same moment both pass the check above; the database's
    // unique (jobId, candidateId) index stops the second one.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw conflict('ALREADY_APPLIED', `${profile.fullName} has already applied to this job.`);
    }
    throw err;
  }
}

// Move an application to a new stage, enforcing the stage rules.
export async function moveStage(applicationId, toStage) {
  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) throw notFound('Application');

  if (!canTransition(app.stage, toStage)) {
    throw conflict('INVALID_TRANSITION', transitionError(app.stage, toStage));
  }

  // "WHERE stage = current stage" means that if someone else moved it a moment
  // ago, nothing is updated and we report it instead of overwriting their move.
  const { count } = await prisma.application.updateMany({
    where: { id: applicationId, stage: app.stage },
    data: { stage: toStage },
  });
  if (count === 0) {
    throw conflict('STAGE_CHANGED', 'This application was just moved by someone else. Refresh and try again.');
  }

  const updated = await prisma.application.findUnique({ where: { id: applicationId }, include: withDetails });
  return applicationJson(updated);
}
