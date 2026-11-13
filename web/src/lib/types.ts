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

// ---- Auth ----

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ---- Pipeline ----

export interface Job {
  id: string;
  title: string;
  location: string;
  status: JobStatus;
  createdAt: string;
  applicationCount: number;
  /** Skills the role requires; the AI screening matches candidates against these. */
  skills: string[];
  minExperienceYears: number;
  /** 0–100: share of the AI score given to skills. Experience gets the rest. */
  skillsWeight: number;
  /** Last day applications are accepted (YYYY-MM-DD), or null for no deadline. */
  closingDate: string | null;
  /** How many top-scoring candidates pass AI screening. */
  screeningPassCount: number;
  /** Applications that passed the most recent AI screening. */
  passedScreeningCount: number;
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

/** Result of the latest AI screening of one application. Scores are 0–100. */
export interface ScreeningResult {
  /**
   * Weighted: skillsScore × skillsWeight + experienceScore × (100 − skillsWeight),
   * plus referralBonus, capped at 100.
   */
  score: number;
  /** 5 when the application was referred, otherwise 0. */
  referralBonus: number;
  skillsScore: number;
  experienceScore: number;
  /** Required skills the AI judged the candidate to have. */
  matchedSkills: string[];
  passed: boolean;
  /** One-line reason from the AI. */
  summary: string;
  screenedAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  stage: Stage;
  createdAt: string;
  updatedAt: string;
  candidate: Candidate;
  allowedNextStages: Stage[];
  /** Came in through a referral. (Referral flow TBD; set by the API for now.) */
  referred: boolean;
  /** Null until the application has been through AI screening. */
  screening: ScreeningResult | null;
}

export interface CreateJobInput {
  title: string;
  location: string;
  status: JobStatus;
  skills: string[];
  minExperienceYears: number;
  skillsWeight: number;
  closingDate: string | null;
  screeningPassCount: number;
}

export interface AddCandidateInput {
  fullName: string;
  email: string;
  phone?: string;
  skills: string[];
  experienceYears: number;
}

/** Response of POST /jobs/:id/screening. */
export interface ScreeningRun {
  /** Applications scored in this run (everyone in the Applied stage). */
  screened: number;
  passed: number;
  applications: Application[];
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
}

export interface CopilotResponse {
  answer: string;
  /** Present when the model wants to change data. Empty for plain answers. */
  pendingActions: PendingMoveStage[];
}
