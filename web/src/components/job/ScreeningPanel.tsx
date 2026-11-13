"use client";

import { useState } from "react";
import { errorMessage } from "@/lib/api";
import { daysUntil, formatDay } from "@/lib/dates";
import { useApplications, useMoveStage, useRunScreening } from "@/lib/queries";
import type { Job } from "@/lib/types";
import { Button } from "@/components/ui/Button";

const years = (n: number) => `${n} ${n === 1 ? "year" : "years"}`;

function closingText(job: Job): string {
  if (!job.closingDate) return "No closing date";
  const days = daysUntil(job.closingDate);
  const day = formatDay(job.closingDate);
  if (days < 0) return `Closed to applications on ${day}`;
  if (days === 0) return `Closes today (${day})`;
  return `Closes ${day} · in ${days} ${days === 1 ? "day" : "days"}`;
}

/**
 * The job's screening setup plus the screening controls. The model only
 * judges skill matches; the API applies the weights and picks the top N,
 * so the trade-off the recruiter set is applied exactly.
 */
export function ScreeningPanel({ job }: { job: Job }) {
  const run = useRunScreening(job.id);
  const move = useMoveStage(job.id);
  // Unfiltered list (shared cache with the board) to find who can be advanced.
  const all = useApplications(job.id, {});
  const [confirming, setConfirming] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  const inApplied = all.data?.filter((a) => a.stage === "APPLIED") ?? [];
  const toAdvance = inApplied.filter((a) => a.screening?.passed && a.allowedNextStages.includes("SCREENING"));

  async function advance() {
    setAdvancing(true);
    setAdvanceError(null);
    const failed: string[] = [];
    for (const app of toAdvance) {
      try {
        await move.mutateAsync({ applicationId: app.id, stage: "SCREENING" });
      } catch (err) {
        failed.push(`${app.candidate.fullName}: ${errorMessage(err)}`);
      }
    }
    setAdvancing(false);
    setConfirming(false);
    if (failed.length) setAdvanceError(`Some moves failed. ${failed.join("; ")}`);
  }

  return (
    <section aria-labelledby="screening-heading" className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <div>
            <h2 id="screening-heading" className="text-sm font-semibold">AI screening</h2>
            <p className="text-xs text-zinc-500">
              Scores everyone in Applied on skills ({job.skillsWeight}%) and experience ({100 - job.skillsWeight}%).
              The top {job.screeningPassCount} pass.
            </p>
          </div>

          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
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
            <dt className="text-zinc-500">Applications</dt>
            <dd>{closingText(job)}</dd>
          </dl>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <p className="text-sm sm:text-right">
            <span className="text-2xl font-semibold tracking-tight">{job.passedScreeningCount}</span>{" "}
            <span className="text-zinc-500">passed AI screening</span>
          </p>
          <Button
            variant="secondary"
            onClick={() => run.mutate()}
            loading={run.isPending}
            disabled={inApplied.length === 0 || advancing}
            title={inApplied.length === 0 ? "No candidates in Applied to screen" : undefined}
          >
            {job.passedScreeningCount > 0 || inApplied.some((a) => a.screening) ? "Re-run AI screening" : "Run AI screening"}
          </Button>
        </div>
      </div>

      {run.isPending && (
        <p role="status" className="mt-4 text-sm text-zinc-500">
          Scoring {inApplied.length} {inApplied.length === 1 ? "candidate" : "candidates"}…
        </p>
      )}
      {run.isError && (
        <p role="alert" className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          AI screening failed: {errorMessage(run.error)}
        </p>
      )}
      {run.isSuccess && !run.isPending && (
        <p role="status" className="mt-4 text-sm text-zinc-700">
          Screened {run.data.screened} {run.data.screened === 1 ? "candidate" : "candidates"}:{" "}
          <span className="font-medium">{run.data.passed} passed</span>. Scores are on each card below.
        </p>
      )}

      {toAdvance.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
          <span className="flex-1">
            {toAdvance.length} {toAdvance.length === 1 ? "candidate" : "candidates"} passed and{" "}
            {toAdvance.length === 1 ? "is" : "are"} still in Applied.
          </span>
          {confirming ? (
            <>
              <Button size="sm" onClick={advance} loading={advancing}>
                Confirm: move {toAdvance.length} to Screening
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={advancing}>
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setConfirming(true)}>
              Move to Screening
            </Button>
          )}
        </div>
      )}
      {advanceError && (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {advanceError}
        </p>
      )}
    </section>
  );
}
