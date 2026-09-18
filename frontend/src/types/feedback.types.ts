// Module 10 — Feedback System.
// Shapes mirror the backend Feedback.toJSON() output: `_id` alias plus nested objects.

export type FeedbackContext = "internship" | "interview";
export type FeedbackAuthorRole = "company" | "mentor";

export type FeedbackDimension =
  | "technical"
  | "communication"
  | "professionalism"
  | "problemSolving"
  | "teamwork";

export type FeedbackRatings = Partial<Record<FeedbackDimension, number>>;

export interface FeedbackPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canAcknowledge: boolean;
}

export interface Feedback {
  _id: string;
  id: string;
  context: FeedbackContext;
  progressId: string | null;
  interviewId: string | null;
  applicationId: string;
  studentId: string;
  taskId: string;
  companyId: string;
  authorUserId: string | null;
  authorRole: FeedbackAuthorRole;
  authorName: string | null;
  overallRating: number;
  ratings: FeedbackRatings;
  averageDimensionRating: number | null;
  strengths: string | null;
  improvements: string | null;
  suggestions: string[];
  wouldRecommend: boolean | null;
  aiAssisted: boolean;
  studentAcknowledgedAt: string | null;
  studentResponse: string | null;
  studentRespondedAt: string | null;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string | null;
  };
  task?: { id: string; title: string; category?: string };
  company?: { id: string; companyName: string; logo?: string | null };
  permissions?: FeedbackPermissions;
}

export interface FeedbackPagination {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

export interface FeedbackListResponse {
  records: Feedback[];
  pagination: FeedbackPagination;
}

/** GET /feedback/progress/:id and /feedback/interviews/:id */
export interface FeedbackThread {
  records: Feedback[];
  permissions: {
    canGive: boolean;
    /** Would be allowed once the internship / interview is finished. */
    isAuthorRole: boolean;
    hasGiven: boolean;
    myFeedbackId: string | null;
  };
}

export interface FeedbackSummary {
  studentId: string;
  count: number;
  averageOverall: number | null;
  averageByDimension: Record<FeedbackDimension, number | null>;
  /** 0..1 among authors who answered; null when nobody did. */
  recommendRate: number | null;
  byContext: Record<FeedbackContext, number>;
  recent: Array<{
    id: string;
    context: FeedbackContext;
    authorName: string | null;
    authorRole: FeedbackAuthorRole;
    overallRating: number;
    taskTitle?: string;
    createdAt: string;
    strengthsExcerpt: string;
  }>;
}

export interface FeedbackData {
  context: FeedbackContext;
  progressId?: string;
  interviewId?: string;
  overallRating: number;
  ratings?: FeedbackRatings | null;
  strengths?: string | null;
  improvements?: string | null;
  suggestions?: string[];
  wouldRecommend?: boolean | null;
  aiAssisted?: boolean;
}

export type UpdateFeedbackData = Partial<Omit<FeedbackData, "context" | "progressId" | "interviewId">>;

export type FeedbackIssueSeverity = "info" | "warning" | "critical";

export interface FeedbackIssue {
  code: string;
  severity: FeedbackIssueSeverity;
  message: string;
}

/** POST /feedback/assist — snake_case, as returned by the AI contract. */
export interface FeedbackAssistResult {
  aiGenerated: boolean;
  evidenceSource: "evaluation" | "rules" | "none";
  suggested_overall_rating: number | null;
  suggested_strengths: string[];
  suggested_improvements: string[];
  suggested_suggestions: string[];
  review: { quality_score: number; issues: FeedbackIssue[] };
}

export interface FeedbackAssistData {
  context: FeedbackContext;
  progressId?: string;
  interviewId?: string;
  draft?: {
    strengths?: string;
    improvements?: string;
    suggestions?: string[];
    overallRating?: number | null;
  };
}
