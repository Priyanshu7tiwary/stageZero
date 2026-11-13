"use client";

import { useState } from "react";
import { errorMessage } from "@/lib/api";
import { useMoveStage } from "@/lib/queries";
import { stageLabel } from "@/lib/stages";
import type { Application, ScreeningResult, Stage } from "@/lib/types";
import { Button } from "@/components/ui/Button";

export function ApplicationCard({
  jobId,
  application,
}: {
  jobId: string;
  application: Application;
}) {
  const { candidate, allowedNextStages, screening } = application;
  const move = useMoveStage(jobId);
  const [confirmReject, setConfirmReject] = useState(false);

  const forward = allowedNextStages.filter((s) => s !== "REJECTED");
  const canReject = allowedNextStages.includes("REJECTED");
  const pendingStage = move.isPending ? move.variables?.stage : undefined;

  const moveTo = (stage: Stage) =>
    move.mutate(
      { applicationId: application.id, stage },
      { onSettled: () => setConfirmReject(false) },
    );

  return (
    <article className="rounded-md bg-white p-3 shadow-sm ring-1 ring-zinc-200">
      <p className="truncate text-sm font-medium" title={candidate.fullName}>
        {candidate.fullName}
      </p>
      <p className="truncate text-xs text-zinc-500" title={candidate.email}>
        {candidate.email}
      </p>
      {candidate.phone && <p className="text-xs text-zinc-500">{candidate.phone}</p>}

      <p className="mt-2 text-xs text-zinc-600">
        <span className="font-medium text-zinc-800">
          {candidate.experienceYears} {candidate.experienceYears === 1 ? "yr" : "yrs"}
        </span>
        {candidate.skills.length > 0 && (
          <span title={candidate.skills.join(", ")}>
            {" · "}
            {candidate.skills.slice(0, 3).join(", ")}
            {candidate.skills.length > 3 && ` +${candidate.skills.length - 3}`}
          </span>
        )}
      </p>

      {screening && <ScreeningBadge screening={screening} />}

      {allowedNextStages.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {confirmReject ? (
            <>
              <Button
                size="sm"
                variant="danger"
                loading={pendingStage === "REJECTED"}
                onClick={() => moveTo("REJECTED")}
              >
                Confirm reject
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={move.isPending}
                onClick={() => setConfirmReject(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              {forward.map((stage) => (
                <Button
                  key={stage}
                  size="sm"
                  loading={pendingStage === stage}
                  disabled={move.isPending}
                  onClick={() => moveTo(stage)}
                >
                  Move to {stageLabel(stage)}
                </Button>
              ))}
              {canReject && (
                <Button
                  size="sm"
                  variant="danger"
                  disabled={move.isPending}
                  onClick={() => setConfirmReject(true)}
                >
                  Reject
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {move.isError && (
        <p role="alert" className="mt-2 text-xs text-rose-600">
          {errorMessage(move.error)}
        </p>
      )}
    </article>
  );
}

function ScreeningBadge({ screening }: { screening: ScreeningResult }) {
  return (
    <div className="mt-2 space-y-1">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${
          screening.passed
            ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
            : "bg-zinc-100 text-zinc-600 ring-zinc-200"
        }`}
        title={`AI screening score ${screening.score}/100 (skills ${screening.skillsScore}, experience ${screening.experienceScore}${
          screening.referralBonus ? `, +${screening.referralBonus} referral` : ""
        })`}
      >
        <span aria-hidden="true">{screening.passed ? "✓" : "–"}</span>
        {screening.passed ? "Passed" : "Not passed"}
        <span className="tabular-nums opacity-70">· {screening.score}/100</span>
      </span>
      {screening.referralBonus > 0 && (
        <span
          className="ml-1 inline-flex items-center rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-sky-700 ring-1 ring-sky-200 ring-inset"
          title={`Referred: +${screening.referralBonus} added to the score`}
        >
          +{screening.referralBonus}
          <span className="sr-only"> referral bonus</span>
        </span>
      )}
      <p className="line-clamp-2 text-xs text-zinc-500" title={screening.summary}>
        {screening.summary}
      </p>
    </div>
  );
}
