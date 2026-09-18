import api from "@/lib/api";
import type {
  AdminAnalytics,
  AnalyticsMonths,
  CompanyAnalytics,
  EvaluationMetricKey,
  PerformanceBand,
  PerformanceTrend,
  StudentAnalytics,
  TopPerformerScope,
  TopPerformersResponse,
} from "@/types/analytics.types";

export const ANALYTICS_MONTHS: AnalyticsMonths[] = [6, 12];

// Same labels as the default Module 9 rubric and the AI insight service.
export const METRIC_LABELS: Record<EvaluationMetricKey, string> = {
  quality: "Quality of work",
  timeliness: "Timeliness",
  completion: "Scope completion",
  communication: "Communication",
  effort: "Effort & commitment",
  reliability: "Reliability",
};

export const BAND_LABELS: Record<PerformanceBand, string> = {
  excellent: "Excellent",
  strong: "Strong",
  developing: "Developing",
  needs_support: "Needs support",
  insufficient_data: "Not enough data",
};

export const TREND_LABELS: Record<PerformanceTrend, string> = {
  improving: "Improving",
  stable: "Steady",
  declining: "Declining",
  insufficient_data: "No trend yet",
};

export const FUNNEL_LABELS: Record<string, string> = {
  submitted: "Applied",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  interview_scheduled: "Interview",
  accepted: "Accepted",
};

/** "2026-09" → "Sep" (or "Sep 26" with the year). */
export const monthLabel = (month: string, withYear = false): string => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m || 1) - 1, 1));
  return d.toLocaleDateString("en-US", {
    month: "short",
    ...(withYear ? { year: "2-digit" } : {}),
    timeZone: "UTC",
  });
};

/** A 0..1 rate as a whole percent, or an em dash. */
export const percent = (rate: number | null | undefined): string =>
  rate == null ? "—" : `${Math.round(rate * 100)}%`;

export const analyticsService = {
  async getMine(months: AnalyticsMonths = 12): Promise<StudentAnalytics> {
    const response = await api.get(`/analytics/student?months=${months}`);
    return response.data.data;
  },

  async getStudent(studentId: string, months: AnalyticsMonths = 12): Promise<StudentAnalytics> {
    const response = await api.get(`/analytics/students/${studentId}?months=${months}`);
    return response.data.data;
  },

  async getCompany(months: AnalyticsMonths = 12): Promise<CompanyAnalytics> {
    const response = await api.get(`/analytics/company?months=${months}`);
    return response.data.data;
  },

  async getTopPerformers(scope: TopPerformerScope = "interns", limit = 10): Promise<TopPerformersResponse> {
    const params = new URLSearchParams({ scope, limit: String(limit) });
    const response = await api.get(`/analytics/company/top-performers?${params}`);
    return response.data.data;
  },

  async getAdmin(months: AnalyticsMonths = 12): Promise<AdminAnalytics> {
    const response = await api.get(`/analytics/admin?months=${months}`);
    return response.data.data;
  },
};
