"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/States";

/**
 * Client-side route guard. This is a UX layer only: the API rejects any
 * request without a valid token, which is the real protection.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { state, retry, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (state.status === "unauthenticated") {
      router.replace(pathname === "/" ? "/login" : `/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [state.status, pathname, router]);

  if (state.status === "authenticated") return <>{children}</>;
  if (state.status === "error") {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-24">
        <ErrorState
          title="Couldn't check your session"
          message={state.message}
          onRetry={retry}
          action={
            <button
              type="button"
              onClick={signOut}
              className="inline-flex h-9 items-center rounded-md px-3.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Sign in again
            </button>
          }
        />
      </div>
    );
  }
  return <AuthGateFallback />;
}

export function AuthGateFallback() {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-zinc-400" role="status">
      <Spinner className="size-5" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
