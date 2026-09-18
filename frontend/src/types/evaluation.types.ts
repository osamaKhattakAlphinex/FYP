// Module 9 — Automated Evaluation.
// Shapes mirror the backend toJSON() output: `_id` alias plus nested objects.

export type EvaluationStatus = "draft" | "finalized";

export type EvaluationMetric =
  | "quality"
  | "timeliness"
  | "completion"
  | "communication"
  | "effort"
  | "reliability";

export type EvaluationGrade = "A" | "B" | "C" | "D" | "F";

/** One line of a task's rubric (the "predefined criteria"). */
export interface EvaluationCriterion {
  _id?: string;
  id?: string;
  taskId?: string;
  name: string;
  description?: string | null;
  metric: EvaluationMetric;
  weight: number;
  orderIndex?: number;
}

export interface TaskCriteriaResponse {
  taskId: string;
  taskTitle: string;
  criteria: EvaluationCriterion[];
  /** True when the task has no rubric of its own and the platform default applies. */
  isDefault: boolean;
}

/** One criterion of one evaluation, snapshotted from the rubric. */
export interface EvaluationCriterionScore {
  _id: string;
  id: string;
  evaluationId: string;
  name: string;
  description?: string | null;
  metric: EvaluationMetric;
  weight: number;
  orderIndex: number;
  autoScore: number | null;
  finalScore: number | null;
  rationale?: string | null;
  evidence: string[];
  hasEvidence: boolean;
  adjusted: boolean;
  adjustmentNote?: string | null;
}

/** The measured evidence the scores were computed from (snake_case, as sent to the AI). */
export interface EvaluationEvidence {
  weighted_completion: number;
  milestone_count: number;
  completed_milestones: number;
  required_outstanding: number;
  closed_with_outstanding_work: boolean;
  submission_count: number;
  reviewed_count: number;
  on_time_submission_rate: number | null;
  rework_rate: number | null;
  first_time_approval_rate: number | null;
  average_review_score: number | null;
  /** Absent from the student view. */
  supervisor_rating?: number | null;
  hours_logged: number;
  expected_hours: number | null;
  estimated_hours: number | null;
  active_weeks: number;
  checkin_count: number;
  blockers_raised: number;
  blockers_resolved: number;
  finished_on_time: boolean | null;
  days_late: number;
}

export interface EvaluationPermissions {
  canEdit: boolean;
  canFinalize: boolean;
  canRegenerate: boolean;
  canReopen: boolean;
}

export interface InternshipEvaluation {
  _id: string;
  id: string;
  progressId: string;
  applicationId: string;
  studentId: string;
  taskId: string;
  companyId: string;
  status: EvaluationStatus;
  autoScore: number | null;
  finalScore: number | null;
  grade: EvaluationGrade | null;
  confidence: number | null;
  aiGenerated: boolean;
  summary?: string | null;
  strengths: string[];
  improvements: string[];
  evidence?: EvaluationEvidence | null;
  reviewerNote?: string | null;
  generatedAt?: string | null;
  generationCount: number;
  finalizedAt?: string | null;
  finalizedByRole?: string | null;
  finalizedByName?: string | null;
  verificationCode?: string | null;
  reopenedAt?: string | null;
  reopenReason?: string | null;
  criteria?: EvaluationCriterionScore[];
  student?: {
    _id?: string;
    id: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string | null;
  };
  task?: { _id?: string; id: string; title: string; category?: string };
  company?: { _id?: string; id: string; companyName: string; logo?: string | null };
  permissions?: EvaluationPermissions;
  createdAt?: string;
  updatedAt?: string;
}

export interface EvaluationListResponse {
  records: InternshipEvaluation[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
}

export interface CriterionAdjustment {
  id: string;
  finalScore: number;
  adjustmentNote?: string | null;
}

export interface UpdateEvaluationData {
  criteria?: CriterionAdjustment[];
  summary?: string | null;
  strengths?: string[];
  improvements?: string[];
  reviewerNote?: string | null;
}

/** What the public verification endpoint confirms — deliberately minimal. */
export interface EvaluationVerification {
  verificationCode: string;
  studentName: string | null;
  taskTitle: string | null;
  companyName: string | null;
  grade: EvaluationGrade | null;
  finalScore: number | null;
  finalizedAt: string | null;
}
