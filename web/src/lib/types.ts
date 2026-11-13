/**
 * API contract shared with the backend. The backend is the source of truth
 * for stage rules: every application carries `allowedNextStages`, and the UI
 * only renders those moves.
 */

export const STAGES = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
] as const;
export type Stage = (typeof STAGES)[number];

export const JOB_STATUSES = ["OPEN", "CLOSED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

// ---- Pipeline ----

export interface Job {
  id: string;
  title: string;
  location: string;
  status: JobStatus;
  createdAt: string;
  applicationCount: number;
  /** Skills the role requires. */
  skills: string[];
  minExperienceYears: number;
  /** 0–100: how much skills count against experience (experience gets the rest). */
  skillsWeight: number;
  /** How many top-scoring Applied candidates pass auto-scoring. */
  screeningPassCount: number;
  /** Last day applications are accepted (YYYY-MM-DD), or null for no deadline. */
  closingDate: string | null;
  /** False when the job is closed or its closing date has passed (server clock). */
  acceptingApplications: boolean;
}

export interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  skills: string[];
  experienceYears: number;
}

export interface Application {
  id: string;
  jobId: string;
  stage: Stage;
  createdAt: string;
  updatedAt: string;
  candidate: Candidate;
  allowedNextStages: Stage[];
  /** From auto-scoring (0–100); null until scored. */
  score: number | null;
  scoreSummary: string | null;
  passedScreening: boolean | null;
  /** Came in through a referral. (Referral flow TBD; set by the API for now.) */
  referred: boolean;
}

export interface CreateJobInput {
  title: string;
  location: string;
  status: JobStatus;
  skills: string[];
  minExperienceYears: number;
  skillsWeight: number;
  screeningPassCount: number;
  closingDate: string | null;
}

export interface AddCandidateInput {
  fullName: string;
  email: string;
  phone?: string;
  skills: string[];
  experienceYears: number;
}

export interface ApplicationFilters {
  stage?: Stage;
  search?: string;
}

/** Error body returned by the API for any non-2xx response. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    /** Per-field validation messages, keyed by input field name. */
    fields?: Record<string, string>;
  };
}

// ---- Dashboard ----

/** Totals across every job, from GET /dashboard. */
export interface DashboardStats {
  totalApplications: number;
  /** Distinct people; one candidate can apply to several jobs. */
  totalCandidates: number;
  hired: number;
  inProgress: number;
  rejected: number;
  openJobs: number;
  closedJobs: number;
  byStage: Record<Stage, number>;
}

// ---- Copilot ----

export interface CopilotTurn {
  role: "user" | "assistant";
  content: string;
}

export interface CopilotRequest {
  question: string;
  /** Earlier turns, so follow-up questions have context. */
  history: CopilotTurn[];
}

/** A data-changing tool call the model proposed. Never executed server-side
 *  without the user confirming it in the UI first. */
export interface PendingMoveStage {
  tool: "move_stage";
  applicationId: string;
  candidateName: string;
  fromStage: Stage;
  toStage: Stage;
  /** Set when the move comes from auto-scoring. */
  score: number | null;
}

export interface CopilotResponse {
  answer: string;
  /** Present when the model wants to change data. Empty for plain answers. */
  pendingActions: PendingMoveStage[];
}
