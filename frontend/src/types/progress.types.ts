// Module 8 — Progress Tracking.
// Shapes mirror the backend toJSON() output: `_id` alias plus nested objects.

export type ProgressStatus =
  | "not_started"
  | "in_progress"
  | "paused"
  | "completed"
  | "abandoned";

export type HealthStatus = "on_track" | "at_risk" | "overdue";

export type MilestoneStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "changes_requested"
  | "completed"
  | "blocked"
  | "cancelled";

export type SubmissionStatus =
  | "pending_review"
  | "approved"
  | "changes_requested"
  | "superseded";

export type ProgressUpdateType = "checkin" | "blocker" | "risk_flag" | "note";
export type UpdateAuthorRole = "student" | "mentor" | "company" | "admin";
export type RiskLevel = "low" | "medium" | "high";
export type SignalSeverity = "info" | "warning" | "critical";

export type ProgressScope =
  | "all"
  | "active"
  | "not_started"
  | "in_progress"
  | "paused"
  | "completed"
  | "closed";

/** Whose view of the workspace is being rendered. */
export type ProgressPerspective = "student" | "company" | "mentor" | "admin";

export interface MilestoneSubmission {
  _id: string;
  id: string;
  milestoneId: string;
  progressId: string;
  studentId: string;
  attemptNumber: number;
  summary: string;
  deliverableUrl?: string | null;
  repositoryUrl?: string | null;
  demoUrl?: string | null;
  links: { deliverable?: string; repository?: string; demo?: string };
  hoursSpent?: number | null;
  status: SubmissionStatus;
  reviewerRole?: string | null;
  reviewerName?: string | null;
  reviewNote?: string | null;
  reviewScore?: number | null;
  reviewedAt?: string | null;
  submittedAt: string;
  wasLate: boolean;
  createdAt: string;
  updatedAt: string;
  milestone?: { _id: string; id: string; title: string; dueDate?: string | null };
  reviewer?: { id: string; avatar?: string | null };
}

export interface ProgressMilestone {
  _id: string;
  id: string;
  progressId: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  weight: number;
  isRequired: boolean;
  status: MilestoneStatus;
  dueDate?: string | null;
  estimatedHours?: number | null;
  actualHours: number;
  createdByRole?: string | null;
  startedAt?: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;
  blockedReason?: string | null;
  blockedAt?: string | null;
  reviewerRole?: string | null;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  submissionCount: number;
  createdAt: string;
  updatedAt: string;

  /** Derived server-side so the client never re-implements the date rules. */
  isOverdue: boolean;
  daysUntilDue: number | null;
  allowedTransitions: MilestoneStatus[];

  submissions?: MilestoneSubmission[];
}

export interface ProgressTimeLog {
  _id: string;
  id: string;
  progressId: string;
  milestoneId?: string | null;
  studentId: string;
  workDate: string;
  hours: number;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  milestone?: { _id: string; id: string; title: string };
}

export interface ProgressUpdateEntry {
  _id: string;
  id: string;
  progressId: string;
  milestoneId?: string | null;
  authorUserId?: string | null;
  authorRole: UpdateAuthorRole;
  authorName?: string | null;
  type: ProgressUpdateType;
  body: string;
  percentSelfReported?: number | null;
  isSystemGenerated: boolean;
  resolvedAt?: string | null;
  resolvedByUserId?: string | null;
  resolutionNote?: string | null;
  isOpen: boolean;
  needsResolution: boolean;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; avatar?: string | null };
  milestone?: { _id: string; id: string; title: string };
}

export interface ProgressHistoryEntry {
  _id: string;
  id: string;
  progressId: string;
  milestoneId?: string | null;
  entityType: "internship" | "milestone";
  milestoneTitle?: string | null;
  fromStatus?: string | null;
  toStatus: string;
  changedByRole?: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface ProgressMetrics {
  progressPercent: number;
  milestoneCount: number;
  completedMilestoneCount: number;
  overdueMilestoneCount: number;
  openBlockerCount: number;
  totalHoursLogged: number;
}

export interface ProgressSchedule {
  startDate?: string;
  targetEndDate?: string;
  actualEndDate?: string;
  daysRemaining: number | null;
  elapsedRatio: number | null;
}

export interface ProgressPermissions {
  canWork: boolean;
  canSupervise: boolean;
  canEditPlan: boolean;
  canChangeStatus: boolean;
  canClose: boolean;
}

export interface InternshipProgress {
  _id: string;
  id: string;
  applicationId: string;
  studentId: string;
  taskId: string;
  companyId: string;
  mentorId?: string | null;

  status: ProgressStatus;
  healthStatus: HealthStatus;

  metrics: ProgressMetrics;
  schedule: ProgressSchedule;

  expectedHoursPerWeek?: number | null;
  objective?: string | null;

  lastActivityAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  pausedAt?: string | null;
  abandonedAt?: string | null;
  statusReason?: string | null;

  completionNote?: string | null;
  /** Supervisor-only; the API strips it from a student's response. */
  performanceRating?: number | null;
  closedWithOutstandingWork: boolean;

  createdAt: string;
  updatedAt: string;

  // Populated relations
  student?: {
    _id: string;
    id: string;
    firstName: string;
    lastName: string;
    headline?: string | null;
    profilePicture?: string | null;
    locationCity?: string | null;
    locationCountry?: string | null;
  };
  company?: {
    _id: string;
    id: string;
    companyName: string;
    logo?: string | null;
    industry?: string | null;
  };
  task?: {
    _id: string;
    id: string;
    title: string;
    category?: string;
    experienceLevel?: string;
    status?: string;
    duration?: { value?: number; unit?: string };
  };
  mentor?: {
    _id: string;
    id: string;
    firstName: string;
    lastName: string;
    headline?: string | null;
    profilePicture?: string | null;
    currentPosition?: string | null;
  };
  application?: { _id: string; id: string; status: string; decidedAt?: string | null };

  milestones?: ProgressMilestone[];
  updates?: ProgressUpdateEntry[];
  statusHistory?: ProgressHistoryEntry[];

  /** Only present on the single-record endpoint. */
  permissions?: ProgressPermissions;
}

export interface ProgressPagination {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

export interface ProgressListResponse {
  records: InternshipProgress[];
  pagination: ProgressPagination;
}

export interface ProgressOverview {
  total: number;
  statusCounts: Record<ProgressStatus, number>;
  healthCounts: Record<HealthStatus, number>;
  averageProgress: number;
  totalHoursLogged: number;
  openBlockers: number;
  overdueMilestones: number;
  submissionsAwaitingReview: number;
  needsAttention: number;
}

// ----- report -----

export interface RiskSignal {
  code: string;
  severity: SignalSeverity;
  message: string;
  weight: number;
}

export interface ProgressInsight {
  progress_id: string;
  risk_level: RiskLevel;
  risk_score: number;
  projected_completion_percent: number;
  schedule_variance: number;
  summary: string;
  signals: RiskSignal[];
  recommendations: string[];
  indicators: Record<string, number>;
}

export interface ProgressReport {
  progress: InternshipProgress;
  /** false when the AI service was unreachable and the local fallback was used. */
  aiGenerated: boolean;
  insight: ProgressInsight;
  indicators: Record<string, number>;
  milestoneStatusBreakdown: Record<MilestoneStatus, number>;
  milestones: ProgressMilestone[];
  weeklyHours: Array<{ weekStart: string; hours: number }>;
  submissionCount: number;
  pendingReviewCount: number;
  openBlockers: ProgressUpdateEntry[];
  recentCheckins: number;
}

export interface TimeLogsResponse {
  timeLogs: ProgressTimeLog[];
  count: number;
  totalHours: number;
  series: Array<{ date: string; hours: number }>;
}

export interface UpdatesResponse {
  updates: ProgressUpdateEntry[];
  count: number;
  openCount: number;
}

// ----- request payloads -----

export interface UpdateProgressPlanData {
  startDate?: string | null;
  targetEndDate?: string | null;
  objective?: string | null;
  expectedHoursPerWeek?: number | null;
}

export interface ProgressStatusChangeData {
  status: ProgressStatus;
  reason?: string;
}

export interface CompleteProgressData {
  completionNote?: string;
  performanceRating?: number | null;
  acknowledgeIncomplete?: boolean;
}

export interface MilestoneData {
  title: string;
  description?: string;
  weight?: number;
  isRequired?: boolean;
  dueDate?: string | null;
  estimatedHours?: number | null;
  orderIndex?: number;
}

export interface SubmitMilestoneData {
  summary: string;
  deliverableUrl?: string;
  repositoryUrl?: string;
  demoUrl?: string;
  hoursSpent?: number | null;
}

export interface ReviewMilestoneData {
  action: "approve" | "request_changes";
  note?: string;
  score?: number | null;
}

export interface MilestoneStatusData {
  status: MilestoneStatus;
  reason?: string;
}

export interface TimeLogData {
  hours: number;
  workDate?: string;
  milestoneId?: string | null;
  description?: string;
}

export interface CreateUpdateData {
  body: string;
  type?: ProgressUpdateType;
  milestoneId?: string | null;
  percentSelfReported?: number | null;
}
