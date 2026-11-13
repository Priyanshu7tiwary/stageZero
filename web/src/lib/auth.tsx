"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, errorMessage, onSessionChange, refreshSession } from "./api";
import type { LoginInput, Session, SignupInput, User } from "./types";

/**
 * Session handling. The JWTs live in httpOnly cookies, so this code never sees
 * them: it only knows who is signed in and when the access token expires.
 *
 * - On every page load (and browser refresh) the API checks the JWT (/auth/me).
 * - About a minute before the access token expires, it is refreshed using the
 *   refresh cookie, so the user never hits an expired token mid-use.
 * - If refreshing fails, the user is signed out.
 */

/** Refresh this long before the access token expires. */
const REFRESH_EARLY_MS = 60_000;

export type AuthState =
  | { status: "checking" }
  | { status: "authenticated"; user: User; expiresAt: number }
  | { status: "unauthenticated" }
  /** Couldn't check the session (e.g. API down). Not the same as signed out. */
  | { status: "error"; message: string };

interface AuthContextValue {
  state: AuthState;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: SignupInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** Ask the API to verify the JWT again (used by useAuthCheck). */
  check: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: "checking" });

  const applySession = useCallback(
    (session: Session | null) => {
      if (session) {
        setState({ status: "authenticated", user: session.user, expiresAt: Date.parse(session.accessTokenExpiresAt) });
      } else {
        queryClient.clear(); // drop cached data so the next user never sees it
        setState({ status: "unauthenticated" });
      }
    },
    [queryClient],
  );

  // Hear about refreshes and session ends that happen inside api.ts.
  useEffect(() => {
    onSessionChange(applySession);
    return () => onSessionChange(null);
  }, [applySession]);

  const check = useCallback(async () => {
    try {
      // /auth/me verifies the JWT; an expired one is refreshed automatically by api.ts.
      applySession(await api.me());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) applySession(null);
      else setState({ status: "error", message: errorMessage(err) });
    }
  }, [applySession]);

  // Refresh shortly before the access token expires.
  const expiresAt = state.status === "authenticated" ? state.expiresAt : null;
  useEffect(() => {
    if (expiresAt === null) return;
    const delay = Math.max(expiresAt - Date.now() - REFRESH_EARLY_MS, 0);
    const timer = setTimeout(() => {
      refreshSession().catch(() => {
        /* refreshSession already signs out on 401; other errors retry on the next request */
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [expiresAt]);

  const signIn = useCallback(async (input: LoginInput) => applySession(await api.login(input)), [applySession]);
  const signUp = useCallback(async (input: SignupInput) => applySession(await api.signup(input)), [applySession]);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      applySession(null);
    }
  }, [applySession]);

  const value = useMemo(() => ({ state, signIn, signUp, signOut, check }), [state, signIn, signUp, signOut, check]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/**
 * Re-verifies the JWT with the API on every page load (including a browser
 * refresh), on every in-app navigation, and when the tab becomes visible again
 * (e.g. after the laptop slept). An expired token is refreshed; a dead session
 * signs the user out.
 */
export function useAuthCheck() {
  const { check } = useAuth();
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  // Page load / browser refresh, and each navigation to a new page.
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    void check();
  }, [pathname, check]);

  // Coming back to the tab.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [check]);
}

/** Only allow same-site relative paths, so `?next=` can't redirect off-site. */
export function safeNextPath(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
