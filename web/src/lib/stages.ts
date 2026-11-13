import type { Stage } from "./types";

/** Display-only metadata. Transition rules live in the API. */
export const STAGE_META: Record<
  Stage,
  { label: string; badge: string; column: string }
> = {
  APPLIED: {
    label: "Applied",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    column: "border-t-slate-400",
  },
  SCREENING: {
    label: "Screening",
    badge: "bg-sky-50 text-sky-700 ring-sky-200",
    column: "border-t-sky-500",
  },
  INTERVIEW: {
    label: "Interview",
    badge: "bg-violet-50 text-violet-700 ring-violet-200",
    column: "border-t-violet-500",
  },
  OFFER: {
    label: "Offer",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    column: "border-t-amber-500",
  },
  HIRED: {
    label: "Hired",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    column: "border-t-emerald-500",
  },
  REJECTED: {
    label: "Rejected",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    column: "border-t-rose-400",
  },
};

export const stageLabel = (stage: Stage) => STAGE_META[stage].label;
