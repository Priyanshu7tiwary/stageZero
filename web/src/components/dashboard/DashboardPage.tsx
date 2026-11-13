"use client";

import { errorMessage } from "@/lib/api";
import { useDashboard } from "@/lib/queries";
import { STAGE_META } from "@/lib/stages";
import { STAGES, type DashboardStats } from "@/lib/types";
import { ErrorState, Skeleton } from "@/components/ui/States";

const full = new Intl.NumberFormat("en");
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
/** 1,284 stays in full; 12,900 becomes 12.9K. */
const formatCount = (n: number) => (n < 10_000 ? full.format(n) : compact.format(n));
const plural = (n: number, one: string, many = `${one}s`) => `${formatCount(n)} ${n === 1 ? one : many}`;

export function DashboardPage() {
  const dashboard = useDashboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-zinc-500">Hiring across all jobs.</p>
      </div>

      {dashboard.isPending ? (
        <DashboardSkeleton />
      ) : dashboard.isError ? (
        <ErrorState
          title="Couldn't load the dashboard"
          message={errorMessage(dashboard.error)}
          onRetry={() => dashboard.refetch()}
        />
      ) : (
        // Background refetches keep the current numbers on screen, dimmed.
        <div className={`space-y-6 transition-opacity ${dashboard.isFetching ? "opacity-70" : ""}`}>
          <Dashboard stats={dashboard.data} />
        </div>
      )}
    </div>
  );
}

function Dashboard({ stats }: { stats: DashboardStats }) {
  return (
    <>
      <section aria-label="Key numbers" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="People hired"
          value={stats.hired}
          detail={stats.totalApplications ? `Out of ${plural(stats.totalApplications, "application")}` : "No applications yet"}
        />
        <StatTile
          label="Total applications"
          value={stats.totalApplications}
          detail={`From ${plural(stats.totalCandidates, "candidate")}`}
        />
        <StatTile
          label="In progress"
          value={stats.inProgress}
          detail={`${plural(stats.rejected, "rejection")} so far`}
        />
        <StatTile
          label="Open jobs"
          value={stats.openJobs}
          detail={`${formatCount(stats.closedJobs)} closed`}
        />
      </section>

      <StageBreakdown stats={stats} />
    </>
  );
}

function StatTile({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
      <p className="text-sm text-zinc-500">{label}</p>
      {/* Standalone figures keep proportional digits; tabular-nums is for columns. */}
      <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">{formatCount(value)}</p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

/**
 * Applications per stage as a meter list: name, bar, figure on each row.
 * Single series, so one hue (blue) and no legend; the track is a lighter step
 * of the same ramp. Every value is printed, so hover only adds the share.
 */
function StageBreakdown({ stats }: { stats: DashboardStats }) {
  const total = stats.totalApplications;
  return (
    <section className="max-w-3xl rounded-lg border border-zinc-200 bg-white p-4 sm:p-5" aria-labelledby="by-stage">
      <h2 id="by-stage" className="text-sm font-semibold">Applications by stage</h2>
      <p className="text-xs text-zinc-500">Where every application currently sits.</p>

      {total === 0 ? (
        <p className="mt-6 mb-2 text-center text-sm text-zinc-500">No applications yet.</p>
      ) : (
        <ul className="mt-4 space-y-1">
          {STAGES.map((stage) => {
            const count = stats.byStage[stage] ?? 0;
            const share = count / total;
            const pct = Math.round(share * 100);
            return (
              <li
                key={stage}
                tabIndex={0}
                aria-label={`${STAGE_META[stage].label}: ${plural(count, "application")}, ${pct}% of all`}
                className="group relative grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 rounded-md px-1.5 py-1.5 outline-none hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-900"
              >
                <span className="truncate text-sm text-zinc-600">{STAGE_META[stage].label}</span>
                {/* Square at the baseline (left), 4px rounded data-end. */}
                <span className="h-2.5 overflow-hidden rounded-r bg-[#cde2fb]">
                  <span
                    className="block h-full rounded-r bg-[#2a78d6] transition-[width] duration-300"
                    style={{ width: `${share * 100}%` }}
                  />
                </span>
                <span className="text-right text-sm font-medium tabular-nums text-zinc-900">{formatCount(count)}</span>

                <span
                  role="presentation"
                  className="pointer-events-none absolute -top-9 left-24 z-10 hidden rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-zinc-300 shadow-lg group-hover:block group-focus-visible:block"
                >
                  <strong className="font-semibold text-white">{pct}%</strong> of all applications · {plural(count, "application")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[106px]" />
        ))}
      </div>
      <Skeleton className="h-72 max-w-3xl" />
    </div>
  );
}
