"use client";

import Link from "next/link";
import { errorMessage } from "@/lib/api";
import { formatDay } from "@/lib/dates";
import { useJobs } from "@/lib/queries";
import { ButtonLink } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";

export function JobsPage() {
  const jobs = useJobs();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Jobs</h1>
          <p className="text-sm text-zinc-500">Track every role and its pipeline.</p>
        </div>
        <ButtonLink href="/jobs/new">Create job</ButtonLink>
      </div>

      {jobs.isPending ? (
        <div className="space-y-2" aria-label="Loading jobs" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[68px]" />
          ))}
        </div>
      ) : jobs.isError ? (
        <ErrorState
          title="Couldn't load jobs"
          message={errorMessage(jobs.error)}
          onRetry={() => jobs.refetch()}
        />
      ) : jobs.data.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          message="Create your first job to start tracking candidates."
          action={<ButtonLink href="/jobs/new">Create job</ButtonLink>}
        />
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {jobs.data.map((job) => (
            <li key={job.id}>
              <Link
                href={`/jobs/${job.id}`}
                className="flex items-center gap-4 px-4 py-3.5 hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{job.title}</p>
                    <StatusBadge status={job.status} />
                  </div>
                  <p className="truncate text-sm text-zinc-500">
                    {job.location}
                    {job.status === "OPEN" && (
                      <>
                        {" · "}
                        {!job.acceptingApplications
                          ? "Applications closed"
                          : job.closingDate
                            ? `Closes ${formatDay(job.closingDate)}`
                            : "No closing date"}
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{job.applicationCount}</p>
                  <p className="text-xs text-zinc-500">
                    {job.applicationCount === 1 ? "application" : "applications"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
