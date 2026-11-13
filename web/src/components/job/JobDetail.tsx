"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, errorMessage } from "@/lib/api";
import { formatDay } from "@/lib/dates";
import { useApplications, useJob } from "@/lib/queries";
import { stageLabel } from "@/lib/stages";
import { STAGES, type Job, type Stage } from "@/lib/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { AddCandidateForm } from "./AddCandidateForm";
import { JobRequirements } from "./JobRequirements";
import { PipelineBoard, PipelineBoardSkeleton } from "./PipelineBoard";

export function JobDetail({ jobId }: { jobId: string }) {
  const job = useJob(jobId);

  if (job.isPending) return <JobDetailSkeleton />;
  if (job.isError) {
    const notFound = job.error instanceof ApiError && job.error.status === 404;
    return (
      <div className="mx-auto max-w-xl pt-8">
        <ErrorState
          title={notFound ? "Job not found" : "Couldn't load this job"}
          message={notFound ? "It may have been removed, or the link is wrong." : errorMessage(job.error)}
          onRetry={notFound ? undefined : () => job.refetch()}
          action={
            <Link href="/jobs" className="inline-flex h-9 items-center rounded-md px-3.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
              Back to jobs
            </Link>
          }
        />
      </div>
    );
  }
  return <JobWorkspace job={job.data} />;
}

function JobWorkspace({ job }: { job: Job }) {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<Stage | "">("");
  const [showAdd, setShowAdd] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim());

  const filters = { search: debouncedSearch || undefined, stage: stage || undefined };
  const applications = useApplications(job.id, filters);
  const isFiltered = Boolean(filters.search || filters.stage);
  // Closed by status or past its closing date; the API decides (server clock).
  const isClosed = !job.acceptingApplications;
  const closedReason =
    job.status === "CLOSED"
      ? "This job is closed."
      : `Applications closed on ${job.closingDate ? formatDay(job.closingDate) : "the closing date"}.`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/jobs" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← All jobs
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{job.title}</h1>
              <StatusBadge status={job.status} />
            </div>
            <p className="text-sm text-zinc-500">
              {job.location} · {job.applicationCount}{" "}
              {job.applicationCount === 1 ? "application" : "applications"}
            </p>
          </div>
          {!showAdd && (
            <Button
              onClick={() => setShowAdd(true)}
              disabled={isClosed}
              title={isClosed ? "This job isn't accepting new applications" : undefined}
            >
              Add candidate
            </Button>
          )}
        </div>
        {isClosed && (
          <p className="mt-3 rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
            {closedReason} Existing candidates can still be moved, but no new applications can be added.
          </p>
        )}
      </div>

      <section className="min-w-0 space-y-4" aria-label="Pipeline">
        <JobRequirements job={job} />

        {showAdd && !isClosed && (
          <AddCandidateForm jobId={job.id} onDone={() => setShowAdd(false)} />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates by name"
            aria-label="Search candidates by name"
            className="h-9 w-full max-w-xs rounded-md border-0 bg-white px-3 text-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
          />
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as Stage | "")}
            aria-label="Filter by stage"
            className="h-9 rounded-md border-0 bg-white px-3 text-sm ring-1 ring-inset ring-zinc-300 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
          >
            <option value="">All stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {stageLabel(s)}
              </option>
            ))}
          </select>
          {isFiltered && (
            <Button variant="ghost" onClick={() => { setSearch(""); setStage(""); }}>
              Clear
            </Button>
          )}
          {applications.isFetching && !applications.isPending && (
            <Spinner className="size-4 text-zinc-400" />
          )}
        </div>

        {applications.isPending ? (
          <PipelineBoardSkeleton />
        ) : applications.isError ? (
          <ErrorState
            title="Couldn't load candidates"
            message={errorMessage(applications.error)}
            onRetry={() => applications.refetch()}
          />
        ) : applications.data.length === 0 ? (
          isFiltered ? (
            <EmptyState
              title="No candidates match"
              message="Try a different name or stage."
            />
          ) : (
            <EmptyState
              title="No candidates yet"
              message={isClosed ? "This job closed before anyone applied." : "Add the first candidate to start the pipeline."}
              action={!isClosed && !showAdd && <Button onClick={() => setShowAdd(true)}>Add candidate</Button>}
            />
          )
        ) : (
          <PipelineBoard
            jobId={job.id}
            applications={applications.data}
            stages={filters.stage ? [filters.stage] : [...STAGES]}
          />
        )}
      </section>
    </div>
  );
}

export function JobDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading job">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <PipelineBoardSkeleton />
    </div>
  );
}
