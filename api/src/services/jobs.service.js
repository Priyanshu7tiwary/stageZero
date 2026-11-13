import { prisma } from '../db.js';
import { dayToDate, today } from '../lib/dates.js';
import { badRequest, notFound } from '../lib/errors.js';
import { jobJson } from '../serializers.js';

// How many applications each job has: Map(jobId -> count).
async function applicationCounts(jobIds) {
  const rows = await prisma.application.groupBy({
    by: ['jobId'],
    where: { jobId: { in: jobIds } },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.jobId, row._count._all]));
}

export async function listJobs() {
  const jobs = await prisma.job.findMany({ orderBy: { createdAt: 'desc' } });
  const counts = await applicationCounts(jobs.map((j) => j.id));
  return jobs.map((job) => jobJson(job, counts.get(job.id) ?? 0));
}

// The raw row (services use it for rules); throws 404 if missing.
export async function findJobOr404(jobId) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw notFound('Job');
  return job;
}

export async function getJob(jobId) {
  const job = await findJobOr404(jobId);
  const counts = await applicationCounts([job.id]);
  return jobJson(job, counts.get(job.id) ?? 0);
}

export async function createJob(input) {
  if (input.closingDate && input.closingDate < today()) {
    throw badRequest({ closingDate: "Closing date can't be in the past" });
  }
  const job = await prisma.job.create({ data: { ...input, closingDate: dayToDate(input.closingDate) } });
  return jobJson(job);
}
