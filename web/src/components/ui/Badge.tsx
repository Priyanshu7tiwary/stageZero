import { STAGE_META } from "@/lib/stages";
import type { JobStatus, Stage } from "@/lib/types";

const BASE = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset";

export function StageBadge({ stage }: { stage: Stage }) {
  return <span className={`${BASE} ${STAGE_META[stage].badge}`}>{STAGE_META[stage].label}</span>;
}

export function StatusBadge({ status }: { status: JobStatus }) {
  return status === "OPEN" ? (
    <span className={`${BASE} bg-emerald-50 text-emerald-700 ring-emerald-200`}>Open</span>
  ) : (
    <span className={`${BASE} bg-zinc-100 text-zinc-600 ring-zinc-200`}>Closed</span>
  );
}
