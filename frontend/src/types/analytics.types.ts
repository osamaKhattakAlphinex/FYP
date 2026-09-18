// Module 11 — Performance Analytics. Mirrors the payloads built by
// backend/src/services/analyticsService.js. Rates are 0..1 (3dp); every
// average is null when there is nothing to average.

export type AnalyticsMonths = 6 | 12;
export type AnalyticsAudience = "self" | "viewer";
export type PerformanceBand = "excellent" | "strong" | "developing" | "needs_support" | "insufficient_data";
export type PerformanceTrend = "improving" | "stable" | "declining" | "insufficient_data";
export type TopPerformerScope = "interns" | "applicants";
export type Grade = "A" | "B" | "C" | "D" | "F";
export type EvaluationMetricKey =
  | "quality"
  | "timeliness"
  | "completion"
  | "communication"
  | "effort"
  | "reliability";

/** The AI (or fallback) insight on one student's record. snake_case, as in the AI contract. */
export interface PerformanceInsight {
  id: string;
  performance_index: number;
  band: PerformanceBand;
  trend: PerformanceTrend;
  trend_slope: number | null;
  predicted_next_score: number | null;
  confidence: number;
  strengths: string[];
  focus_areas: string[];
  insights: string[];
}

export interface ScoreHistoryPoint {
  evaluationId: string;
  progressId: string | null;
  taskTitle: string | null;
  companyName: string | null;
  finalScore: number;
  grade: Grade | null;
  finalizedAt: string;
}

export interface CriterionAverage {
  metric: EvaluationMetricKey;
  average: number;
  samples: number;
}

export interface SkillGrowth {
  name: string;
  profileLevel: string | null;
  internships: number;
  scores: Array<{ finalizedAt: string; finalScore: number; taskTitle: string | null }>;
  firstScore: number | null;
  latestScore: number | null;
  change: number | null;
  trend: PerformanceTrend;
}

export interface StudentAnalyticsSummary {
  /** Absent for `audience: 'viewer'`. */
  applications?: { total: number; byStatus: Record<string, number>; acceptanceRate: number | null };
  /** Absent for `audience: 'viewer'`. */
  interviews?: { total: number; completed: number };
  internships: { total: number; byStatus: Record<string, number>; completed: number; active: number };
  hoursLogged: number;
  finalizedEvaluations: number;
  averageEvaluationScore: number | null;
  latestGrade: Grade | null;
  feedback: { count: number; averageOverall: number | null; recommendRate: number | null };
  onTimeSubmissionRate: number | null;
}

export interface StudentAnalytics {
  studentId: string;
  audience: AnalyticsAudience;
  months: AnalyticsMonths;
  generatedAt: string;
  summary: StudentAnalyticsSummary;
  scoreHistory: ScoreHistoryPoint[];
  hoursByMonth: Array<{ month: string; hours: number }>;
  criteriaAverages: CriterionAverage[];
  skills: SkillGrowth[];
  aiGenerated: boolean;
  insight: PerformanceInsight | null;
  /** Module 12 — present only for the student themself (and admins). */
  earnings?: StudentEarnings;
}

/**
 * Module 12 money figures. Headline numbers are in `currency` (the one with
 * the most paid volume); `byCurrency` lists every currency — amounts in
 * different currencies are never added together.
 */
export interface StudentEarnings {
  currency: string | null;
  totalNet: number;
  refunded: number;
  pending: number;
  payments: number;
  byCurrency: Array<{ currency: string; totalNet: number; refunded: number; pending: number }>;
  byMonth: Array<{ month: string; net: number }>;
}

export interface CompanySpend {
  currency: string | null;
  totalPaid: number;
  totalFees: number;
  refunded: number;
  open: number;
  payments: number;
  byCurrency: Array<{ currency: string; totalPaid: number; totalFees: number; refunded: number }>;
  byMonth: Array<{ month: string; paid: number }>;
}

export interface AdminPaymentsAnalytics {
  total: number;
  byStatus: Record<string, number>;
  byProvider: Record<string, number>;
  currency: string | null;
  volume: number;
  fees: number;
  refunded: number;
  byCurrency: Array<{ currency: string; volume: number; fees: number; refunded: number; payments: number }>;
}

export interface FunnelStage {
  stage: string;
  count: number;
  rate: number | null;
}

export interface MonthlyActivity {
  month: string;
  applications: number;
  acceptances: number;
  completions: number;
}

export interface TopPerformer {
  rank: number;
  student: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    headline: string | null;
    profilePicture: string | null;
  };
  performanceIndex: number;
  band: PerformanceBand;
  trend: PerformanceTrend;
  predictedNextScore: number | null;
  confidence: number;
  averageEvaluationScore: number | null;
  evaluationCount: number;
  feedbackAverage: number | null;
  completedInternships: number;
  strengths: string[];
}

export interface TopPerformersResponse {
  scope: TopPerformerScope;
  limit: number;
  aiGenerated: boolean;
  candidates: number;
  unrated: number;
  rankings: TopPerformer[];
}

export interface CompanyAnalytics {
  companyId: string;
  months: AnalyticsMonths;
  generatedAt: string;
  summary: {
    tasks: { total: number; byStatus: Record<string, number> };
    applications: { total: number; byStatus: Record<string, number> };
    funnel: FunnelStage[];
    conversionRate: number | null;
    avgDaysToDecision: number | null;
    interviews: { total: number; completed: number; no_show: number };
    internships: {
      total: number;
      byStatus: Record<string, number>;
      byHealth: Record<string, number>;
      averageProgress: number | null;
    };
    evaluations: {
      finalized: number;
      drafts: number;
      averageScore: number | null;
      gradeDistribution: Record<Grade, number>;
    };
    feedbackGiven: { count: number; averageOverall: number | null };
  };
  monthly: MonthlyActivity[];
  tasks: Array<{
    taskId: string;
    title: string;
    status: string;
    applications: number;
    accepted: number;
    completedInternships: number;
    averageEvaluationScore: number | null;
  }>;
  aiGenerated: boolean;
  topPerformers: TopPerformer[];
  /** Module 12. */
  spend?: CompanySpend;
}

export interface AIHealth {
  reachable: boolean;
  p95LatencyMs: number;
  errorRatePerMin: number;
  sampleSize: number;
  totalSamples: number;
  lastSuccessAt: string | null;
}

export interface AdminAnalytics {
  months: AnalyticsMonths;
  generatedAt: string;
  users: {
    total: number;
    byRole: Record<string, number>;
    newByMonth: Array<{ month: string; users: number }>;
  };
  companies: { total: number };
  mentors: { byVerificationStatus: Record<string, number> };
  tasks: {
    total: number;
    byStatus: Record<string, number>;
    byCategory: Array<{ category: string; count: number }>;
  };
  applications: { total: number; byStatus: Record<string, number>; monthly: MonthlyActivity[] };
  interviews: { byStatus: Record<string, number> };
  internships: {
    byStatus: Record<string, number>;
    byHealth: Record<string, number>;
    averageProgress: number | null;
    totalHoursLogged: number;
  };
  evaluations: {
    total: number;
    finalized: number;
    averageScore: number | null;
    gradeDistribution: Record<Grade, number>;
    aiGeneratedShare: number | null;
  };
  feedback: { total: number; averageOverall: number | null; byContext: Record<string, number> };
  topCompanies: Array<{ companyId: string; companyName: string | null; completedInternships: number }>;
  aiHealth: AIHealth | null;
  /** Module 12. */
  payments?: AdminPaymentsAnalytics;
}
