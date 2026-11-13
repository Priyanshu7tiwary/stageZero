"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, errorMessage, setAuthToken, setUnauthorizedHandler } from "./api";
import type { LoginInput, User } from "./types";

const TOKEN_KEY = "ats.token";

// localStorage can throw (private mode, blocked storage); the app still works
// for the current tab, the session just won't survive a reload.
const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  },
};

export type AuthState =
  | { status: "checking" }
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated" }
  /** Couldn't verify a saved session (e.g. API down). Not the same as signed out. */
  | { status: "error"; message: string };

interface AuthContextValue {
  state: AuthState;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => void;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: "checking" });
  const [attempt, setAttempt] = useState(0);

  const signOut = useCallback(() => {
    tokenStore.clear();
    setAuthToken(null);
    // Drop cached pipeline data so the next user never sees it.
    queryClient.clear();
    setState({ status: "unauthenticated" });
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // Restore a saved session on load: verify the stored token with the API.
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const token = tokenStore.get();
      if (!token) {
        setState({ status: "unauthenticated" });
        return;
      }
      setAuthToken(token);
      try {
        const user = await api.me(controller.signal);
        setState({ status: "authenticated", user });
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) return; // handler signed us out
        setState({ status: "error", message: errorMessage(err) });
      }
    })();
    return () => controller.abort();
  }, [attempt]);

  const signIn = useCallback(async (input: LoginInput) => {
    const { token, user } = await api.login(input);
    tokenStore.set(token);
    setAuthToken(token);
    setState({ status: "authenticated", user });
  }, []);

  const retry = useCallback(() => {
    setState({ status: "checking" });
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ state, signIn, signOut, retry }),
    [state, signIn, signOut, retry],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Only allow same-site relative paths, so `?next=` can't redirect off-site. */
export function safeNextPath(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
