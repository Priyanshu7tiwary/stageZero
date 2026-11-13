import type {
  AddCandidateInput,
  ApiErrorBody,
  Application,
  ApplicationFilters,
  CopilotRequest,
  CopilotResponse,
  CreateJobInput,
  DashboardStats,
  Job,
  LoginInput,
  Session,
  SignupInput,
  Stage,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    /** HTTP status, or 0 when the server could not be reached. */
    public readonly status: number,
    message: string,
    public readonly code: string = "UNKNOWN",
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isErrorBody(body: unknown): body is ApiErrorBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as ApiErrorBody).error?.message === "string"
  );
}

// ---- Session ----
// The access and refresh tokens live in httpOnly cookies set by the API: this
// code never sees them. The API only tells us WHEN the access token expires,
// so we can refresh it a little before that (see lib/auth.tsx).

type SessionListener = (session: Session | null) => void;
let sessionListener: SessionListener | null = null;

/** AuthProvider registers here to hear about new sessions and sign-outs. */
export function onSessionChange(listener: SessionListener | null) {
  sessionListener = listener;
}

let refreshing: Promise<Session> | null = null;

/**
 * Get a new access token using the refresh cookie. Concurrent callers share
 * one request, so a burst of 401s triggers a single refresh.
 */
export function refreshSession(): Promise<Session> {
  refreshing ??= send<Session>("/auth/refresh", { method: "POST" })
    .then((session) => {
      sessionListener?.(session);
      return session;
    })
    .catch((err) => {
      if (err instanceof ApiError && err.status === 401) sessionListener?.(null);
      throw err;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

// 401 codes that mean "your session may just need a refresh".
const REFRESHABLE = new Set(["TOKEN_EXPIRED", "UNAUTHORIZED"]);

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  try {
    return await send<T>(path, init);
  } catch (err) {
    // Access token expired (or missing): refresh once, then retry the request.
    if (err instanceof ApiError && err.status === 401 && REFRESHABLE.has(err.code)) {
      await refreshSession();
      return send<T>(path, init);
    }
    throw err;
  }
}

async function send<T>(
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? "GET",
      signal: init.signal,
      headers,
      // Send (and accept) the auth cookies even though the API is on another port.
      credentials: "include",
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(
      0,
      "Can't reach the server. Check that the API is running and try again.",
      "NETWORK_ERROR",
    );
  }

  if (res.status === 204) return undefined as T;
  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    if (isErrorBody(body)) {
      throw new ApiError(
        res.status,
        body.error.message,
        body.error.code,
        body.error.fields,
      );
    }
    throw new ApiError(res.status, `Request failed (${res.status}).`);
  }
  return body as T;
}

function toQuery(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const api = {
  // Auth: these use send() directly so a failed login never triggers a refresh.
  login: (input: LoginInput) => send<Session>("/auth/login", { method: "POST", body: input }),
  signup: (input: SignupInput) => send<Session>("/auth/signup", { method: "POST", body: input }),
  logout: () => send<void>("/auth/logout", { method: "POST" }),
  me: (signal?: AbortSignal) => request<Session>("/auth/me", { signal }),

  getDashboard: (signal?: AbortSignal) =>
    request<DashboardStats>("/dashboard", { signal }),

  listJobs: (signal?: AbortSignal) => request<Job[]>("/jobs", { signal }),

  getJob: (jobId: string, signal?: AbortSignal) =>
    request<Job>(`/jobs/${encodeURIComponent(jobId)}`, { signal }),

  createJob: (input: CreateJobInput) =>
    request<Job>("/jobs", { method: "POST", body: input }),

  listApplications: (
    jobId: string,
    filters: ApplicationFilters,
    signal?: AbortSignal,
  ) =>
    request<Application[]>(
      `/jobs/${encodeURIComponent(jobId)}/applications${toQuery({
        stage: filters.stage,
        search: filters.search?.trim(),
      })}`,
      { signal },
    ),

  addCandidate: (jobId: string, input: AddCandidateInput) =>
    request<Application>(`/jobs/${encodeURIComponent(jobId)}/applications`, {
      method: "POST",
      body: input,
    }),

  askCopilot: (jobId: string, input: CopilotRequest) =>
    request<CopilotResponse>(`/jobs/${encodeURIComponent(jobId)}/copilot`, {
      method: "POST",
      body: input,
    }),

  moveStage: (applicationId: string, stage: Stage) =>
    request<Application>(
      `/applications/${encodeURIComponent(applicationId)}/stage`,
      { method: "PATCH", body: { stage } },
    ),

};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

/**
 * Message for a form-level banner. Errors that carry per-field messages are
 * shown inline next to the inputs instead, so they return null here.
 */
export function bannerError(err: unknown): string | null {
  if (!err) return null;
  if (err instanceof ApiError && Object.keys(err.fields).length > 0) return null;
  return errorMessage(err);
}
