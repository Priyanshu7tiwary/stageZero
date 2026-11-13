import { daysUntil, formatDay } from "@/lib/dates";
import type { Job } from "@/lib/types";

const years = (n: number) => `${n} ${n === 1 ? "year" : "years"}`;

function closingText(job: Job): string {
  if (!job.closingDate) return "No closing date";
  const days = daysUntil(job.closingDate);
  const day = formatDay(job.closingDate);
  if (days < 0) return `Closed to applications on ${day}`;
  if (days === 0) return `Closes today (${day})`;
  return `Closes ${day} · in ${days} ${days === 1 ? "day" : "days"}`;
}

/** What the role asks for, and when applications close. */
export function JobRequirements({ job }: { job: Job }) {
  return (
    <section aria-labelledby="requirements-heading" className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
      <h2 id="requirements-heading" className="text-sm font-semibold">
        Requirements
      </h2>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-zinc-500">Skills</dt>
        <dd className="flex flex-wrap gap-1.5">
          {job.skills.length ? (
            job.skills.map((s) => (
              <span key={s} className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                {s}
              </span>
            ))
          ) : (
            <span className="text-zinc-400">None set</span>
          )}
        </dd>
        <dt className="text-zinc-500">Experience</dt>
        <dd>{years(job.minExperienceYears)} or more</dd>
        <dt className="text-zinc-500">Weighting</dt>
        <dd>
          Skills {job.skillsWeight}% · Experience {100 - job.skillsWeight}%
        </dd>
        <dt className="text-zinc-500">Auto-scoring</dt>
        <dd>Top {job.screeningPassCount} in Applied pass</dd>
        <dt className="text-zinc-500">Applications</dt>
        <dd>{closingText(job)}</dd>
      </dl>
    </section>
  );
}
