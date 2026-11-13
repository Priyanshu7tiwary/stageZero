import { prisma } from '../db.js';
import { STAGES } from '../lib/stages.js';

// Totals across all jobs.
export async function dashboardStats() {
  const [stageRows, statusRows, totalCandidates] = await Promise.all([
    prisma.application.groupBy({ by: ['stage'], _count: { _all: true } }),
    prisma.job.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.candidate.count({ where: { applications: { some: {} } } }),
  ]);

  const byStage = Object.fromEntries(STAGES.map((s) => [s, 0]));
  for (const row of stageRows) byStage[row.stage] = row._count._all;
  const jobs = { OPEN: 0, CLOSED: 0 };
  for (const row of statusRows) jobs[row.status] = row._count._all;

  const totalApplications = Object.values(byStage).reduce((sum, n) => sum + n, 0);
  return {
    totalApplications,
    totalCandidates,
    hired: byStage.HIRED,
    rejected: byStage.REJECTED,
    inProgress: totalApplications - byStage.HIRED - byStage.REJECTED,
    openJobs: jobs.OPEN,
    closedJobs: jobs.CLOSED,
    byStage,
  };
}
