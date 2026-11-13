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
  LoginResponse,
  ScreeningRun,
  Stage,
  User,
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

// ---- Session token ----
// Held in memory for requests; AuthProvider persists it and registers the
// handler that runs when the API rejects the token (expired / signed out).
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? "GET",
      signal: init.signal,
      headers,
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

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    // A 401 on a request that carried a token means the session is no longer
    // valid. (A failed login has no token, so it just shows its error.)
    if (res.status === 401 && authToken) onUnauthorized?.();
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
  login: (input: LoginInput) =>
    request<LoginResponse>("/auth/login", { method: "POST", body: input }),

  me: (signal?: AbortSignal) => request<User>("/auth/me", { signal }),

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

  moveStage: (applicationId: string, stage: Stage) =>
    request<Application>(
      `/applications/${encodeURIComponent(applicationId)}/stage`,
      { method: "PATCH", body: { stage } },
    ),

  runScreening: (jobId: string) =>
    request<ScreeningRun>(`/jobs/${encodeURIComponent(jobId)}/screening`, {
      method: "POST",
    }),

  askCopilot: (jobId: string, input: CopilotRequest) =>
    request<CopilotResponse>(`/jobs/${encodeURIComponent(jobId)}/copilot`, {
      method: "POST",
      body: input,
    }),
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
