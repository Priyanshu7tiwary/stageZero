import type { ReactNode } from "react";
import { Button } from "./Button";

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  action,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-rose-200 bg-rose-50 px-5 py-6 text-center"
    >
      <p className="text-sm font-semibold text-rose-800">{title}</p>
      <p className="mt-1 text-sm text-rose-700">{message}</p>
      {(onRetry || action) && (
        <div className="mt-4 flex justify-center gap-2">
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-5 py-10 text-center">
      <p className="text-sm font-semibold text-zinc-800">{title}</p>
      {message && <p className="mt-1 text-sm text-zinc-500">{message}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
    >
      {children}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-200/70 ${className}`} />;
}
