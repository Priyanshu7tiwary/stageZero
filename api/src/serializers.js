// Database rows -> the JSON shapes the frontend expects (web/src/lib/types.ts).
import { dateToDay, isAcceptingApplications } from './lib/dates.js';
import { allowedNextStages } from './lib/stages.js';

export function jobJson(job, applicationCount = 0) {
  return {
    id: job.id,
    title: job.title,
    location: job.location,
    status: job.status,
    createdAt: job.createdAt.toISOString(),
    skills: job.skills,
    minExperienceYears: job.minExperienceYears,
    skillsWeight: job.skillsWeight,
    screeningPassCount: job.screeningPassCount,
    closingDate: dateToDay(job.closingDate),
    applicationCount,
    acceptingApplications: isAcceptingApplications(job),
  };
}

// `app` must include { candidate }.
export function applicationJson(app) {
  const { candidate } = app;
  return {
    id: app.id,
    jobId: app.jobId,
    stage: app.stage,
    referred: app.referred,
    score: app.score,
    scoreSummary: app.scoreSummary,
    passedScreening: app.passedScreening,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    candidate: {
      id: candidate.id,
      fullName: candidate.fullName,
      email: candidate.email,
      phone: candidate.phone,
      skills: candidate.skills,
      experienceYears: candidate.experienceYears,
    },
    // The UI shows exactly these moves; the rules stay on the server.
    allowedNextStages: allowedNextStages(app.stage),
  };
}
