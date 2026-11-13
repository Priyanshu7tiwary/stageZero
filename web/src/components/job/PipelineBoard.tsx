"use client";

import { STAGE_META } from "@/lib/stages";
import type { Application, Stage } from "@/lib/types";
import { Skeleton } from "@/components/ui/States";
import { ApplicationCard } from "./ApplicationCard";

export function PipelineBoard({
  jobId,
  applications,
  stages,
}: {
  jobId: string;
  applications: Application[];
  stages: Stage[];
}) {
  const byStage = new Map<Stage, Application[]>(stages.map((s) => [s, []]));
  for (const app of applications) byStage.get(app.stage)?.push(app);

  return (
    <div
      className={
        stages.length === 1
          ? "max-w-md"
          : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      }
    >
      {/* 3x2 grid keeps every stage visible without horizontal scrolling. */}
        {stages.map((stage) => {
          const items = byStage.get(stage) ?? [];
          return (
            <section
              key={stage}
              aria-label={`${STAGE_META[stage].label} (${items.length})`}
              className={`flex min-w-0 flex-col rounded-lg border border-t-4 border-zinc-200 bg-zinc-100/60 ${STAGE_META[stage].column}`}
            >
              <header className="flex items-center justify-between px-3 py-2">
                <h3 className="text-sm font-semibold text-zinc-700">{STAGE_META[stage].label}</h3>
                <span className="rounded-full bg-white px-2 text-xs font-medium tabular-nums text-zinc-600 ring-1 ring-zinc-200">
                  {items.length}
                </span>
              </header>
              <ul className="flex flex-1 flex-col gap-2 px-2 pb-2">
                {items.length === 0 ? (
                  <li className="rounded-md border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-400">
                    No one here
                  </li>
                ) : (
                  items.map((app) => (
                    <li key={app.id}>
                      <ApplicationCard jobId={jobId} application={app} />
                    </li>
                  ))
                )}
              </ul>
            </section>
          );
        })}
    </div>
  );
}

export function PipelineBoardSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-100/60 p-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ))}
    </div>
  );
}
