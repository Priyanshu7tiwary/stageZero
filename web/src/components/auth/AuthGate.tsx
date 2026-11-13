"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth, useAuthCheck } from "@/lib/auth";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/States";

/**
 * Wraps every signed-in page. Verifies the JWT with the API on each page load
 * and navigation (useAuthCheck), and sends signed-out users to /login.
 * This is a UX layer: the API itself rejects requests without a valid token.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  useAuthCheck();
  const { state, check } = useAuth();
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
        <ErrorState title="Couldn't check your session" message={state.message} onRetry={() => void check()} />
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
