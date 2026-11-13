"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { errorMessage } from "@/lib/api";
import { useAskCopilot, useMoveStage } from "@/lib/queries";
import { stageLabel } from "@/lib/stages";
import type { CopilotTurn, PendingMoveStage } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

type ActionResult = { action: PendingMoveStage; ok: boolean; error?: string };

type Entry =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "error"; text: string; question: string }
  | {
      id: number;
      kind: "assistant";
      text: string;
      actions: PendingMoveStage[];
      actionState: "none" | "awaiting" | "running" | "cancelled" | "done";
      results?: ActionResult[];
    };

type NewEntry = Entry extends infer E ? (E extends Entry ? Omit<E, "id"> : never) : never;

const EXAMPLES = [
  "Who is in the Applied stage?",
  "Summarise where this job's pipeline stands.",
  "Score the applicants and move the ones who pass forward",
];

const MAX_HISTORY_TURNS = 10;

/** Text history for the model, including what happened to proposed actions. */
function toHistory(entries: Entry[]): CopilotTurn[] {
  const turns: CopilotTurn[] = [];
  for (const e of entries) {
    if (e.kind === "user") turns.push({ role: "user", content: e.text });
    if (e.kind === "assistant") {
      let content = e.text;
      if (e.actionState === "cancelled") content += "\n[The user cancelled the proposed action. Nothing was changed.]";
      if (e.actionState === "done" && e.results) {
        const lines = e.results.map((r) =>
          r.ok
            ? `moved ${r.action.candidateName} to ${stageLabel(r.action.toStage)}`
            : `failed to move ${r.action.candidateName}: ${r.error}`,
        );
        content += `\n[After user confirmation: ${lines.join("; ")}.]`;
      }
      turns.push({ role: "assistant", content });
    }
  }
  return turns.slice(-MAX_HISTORY_TURNS);
}

export function CopilotPanel({ jobId }: { jobId: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [question, setQuestion] = useState("");
  const nextId = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);
  const ask = useAskCopilot(jobId);
  const move = useMoveStage(jobId);

  const awaitingConfirmation = entries.some(
    (e) => e.kind === "assistant" && (e.actionState === "awaiting" || e.actionState === "running"),
  );
  const busy = ask.isPending || awaitingConfirmation;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [entries, ask.isPending]);

  const push = (entry: NewEntry) =>
    setEntries((prev) => [...prev, { ...entry, id: nextId.current++ }]);

  const update = (id: number, patch: Partial<Extract<Entry, { kind: "assistant" }>>) =>
    setEntries((prev) =>
      prev.map((e) => (e.id === id && e.kind === "assistant" ? { ...e, ...patch } : e)),
    );

  function submit(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const history = toHistory(entries);
    push({ kind: "user", text: q });
    setQuestion("");
    ask.mutate(
      { question: q, history },
      {
        onSuccess: (res) =>
          push({
            kind: "assistant",
            text: res.answer,
            actions: res.pendingActions,
            actionState: res.pendingActions.length ? "awaiting" : "none",
          }),
        onError: (err) => push({ kind: "error", text: errorMessage(err), question: q }),
      },
    );
  }

  async function confirm(entryId: number, actions: PendingMoveStage[]) {
    update(entryId, { actionState: "running" });
    const results: ActionResult[] = [];
    // Sequential so each move is validated against the latest state.
    for (const action of actions) {
      try {
        await move.mutateAsync({ applicationId: action.applicationId, stage: action.toStage });
        results.push({ action, ok: true });
      } catch (err) {
        results.push({ action, ok: false, error: errorMessage(err) });
      }
    }
    update(entryId, { actionState: "done", results });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit(question);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(question);
    }
  }

  return (
    <section
      aria-label="Copilot"
      className="flex max-h-[calc(100vh-3rem)] flex-col rounded-lg border border-zinc-200 bg-white"
    >
      <header className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold">Copilot</h2>
        <p className="text-xs text-zinc-500">
          Ask about this job&apos;s candidates, move them, or ask it to score the Applied stage. Nothing moves until you confirm.
        </p>
      </header>

      <div ref={logRef} className="min-h-40 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {entries.length === 0 && !ask.isPending && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-500">Try asking</p>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => submit(ex)}
                className="block w-full rounded-md border border-zinc-200 px-3 py-2 text-left text-sm text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {entries.map((entry) => {
          if (entry.kind === "user") {
            return (
              <div key={entry.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-lg bg-zinc-900 px-3 py-2 text-sm whitespace-pre-wrap text-white">
                  {entry.text}
                </p>
              </div>
            );
          }
          if (entry.kind === "error") {
            return (
              <div key={entry.id} role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm">
                <p className="font-medium text-rose-800">The copilot couldn&apos;t answer</p>
                <p className="text-rose-700">{entry.text}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  disabled={busy}
                  onClick={() => {
                    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
                    setQuestion(entry.question);
                  }}
                >
                  Edit &amp; retry
                </Button>
              </div>
            );
          }
          return (
            <div key={entry.id} className="space-y-2">
              <p className="max-w-[95%] rounded-lg bg-zinc-100 px-3 py-2 text-sm whitespace-pre-wrap text-zinc-800">
                {entry.text}
              </p>
              {entry.actions.length > 0 && (
                <ActionConfirmation
                  entry={entry}
                  onConfirm={() => confirm(entry.id, entry.actions)}
                  onCancel={() => update(entry.id, { actionState: "cancelled" })}
                />
              )}
            </div>
          );
        })}

        {ask.isPending && (
          <div className="flex items-center gap-2 text-sm text-zinc-500" role="status">
            <Spinner className="size-4" /> Thinking…
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-2 border-t border-zinc-200 p-3">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          maxLength={1000}
          placeholder={awaitingConfirmation ? "Confirm or cancel the proposed action first" : "Ask a question…"}
          aria-label="Ask the copilot"
          disabled={awaitingConfirmation}
          className="block w-full resize-none rounded-md border-0 px-3 py-2 text-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900 focus:outline-none disabled:bg-zinc-50"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-400">Enter to send · Shift+Enter for a new line</p>
          <Button type="submit" size="sm" loading={ask.isPending} disabled={busy || !question.trim()}>
            Ask
          </Button>
        </div>
      </form>
    </section>
  );
}

function ActionConfirmation({
  entry,
  onConfirm,
  onCancel,
}: {
  entry: Extract<Entry, { kind: "assistant" }>;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { actions, actionState, results } = entry;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm">
      <p className="font-medium text-amber-900">
        {actionState === "done" ? "Result" : actionState === "cancelled" ? "Cancelled" : "The copilot wants to:"}
      </p>
      <ul className="mt-1 space-y-1">
        {actions.map((a, i) => {
          const result = results?.[i];
          return (
            <li key={`${a.applicationId}-${a.toStage}`} className="text-amber-900">
              <span className="font-medium">{a.candidateName}</span>: {stageLabel(a.fromStage)} →{" "}
              <span className="font-medium">{stageLabel(a.toStage)}</span>
              {a.score !== null && <span className="ml-1 text-amber-800">(score {a.score})</span>}
              {result && (
                <span className={result.ok ? "ml-1 text-emerald-700" : "ml-1 text-rose-700"}>
                  {result.ok ? "✓ done" : `✗ ${result.error}`}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {actionState === "cancelled" && <p className="mt-1 text-amber-800">Nothing was changed.</p>}
      {(actionState === "awaiting" || actionState === "running") && (
        <div className="mt-2.5 flex gap-2">
          <Button size="sm" onClick={onConfirm} loading={actionState === "running"}>
            Confirm
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={actionState === "running"}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
