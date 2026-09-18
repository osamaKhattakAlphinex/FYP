import api from "@/lib/api";
import type {
  EvaluationCriterion,
  EvaluationGrade,
  EvaluationListResponse,
  EvaluationMetric,
  EvaluationStatus,
  EvaluationVerification,
  InternshipEvaluation,
  TaskCriteriaResponse,
  UpdateEvaluationData,
} from "@/types/evaluation.types";

const listParams = (page: number, limit: number, status?: EvaluationStatus) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  return params;
};

export const EVALUATION_METRICS: EvaluationMetric[] = [
  "quality",
  "timeliness",
  "completion",
  "communication",
  "effort",
  "reliability",
];

export const evaluationService = {
  // ===== ONE INTERNSHIP =====

  /**
   * The evaluation of a completed internship. For a supervisor the draft is
   * generated on first read if it does not exist yet; a student gets a 404
   * until it has been finalized.
   */
  async getForProgress(progressId: string): Promise<InternshipEvaluation> {
    const response = await api.get(`/evaluations/progress/${progressId}`);
    return response.data.data;
  },

  async regenerate(progressId: string): Promise<InternshipEvaluation> {
    const response = await api.post(`/evaluations/progress/${progressId}/generate`);
    return response.data.data;
  },

  async update(id: string, data: UpdateEvaluationData): Promise<InternshipEvaluation> {
    const response = await api.put(`/evaluations/${id}`, data);
    return response.data.data;
  },

  async finalize(id: string): Promise<InternshipEvaluation> {
    const response = await api.put(`/evaluations/${id}/finalize`);
    return response.data.data;
  },

  async reopen(id: string, reason: string): Promise<InternshipEvaluation> {
    const response = await api.put(`/evaluations/${id}/reopen`, { reason });
    return response.data.data;
  },

  // ===== LISTS =====

  async getStudentEvaluations(page = 1, limit = 10): Promise<EvaluationListResponse> {
    const response = await api.get(`/evaluations/student?${listParams(page, limit)}`);
    return response.data.data;
  },

  async getCompanyEvaluations(
    status?: EvaluationStatus,
    page = 1,
    limit = 10,
  ): Promise<EvaluationListResponse> {
    const response = await api.get(
      `/evaluations/company?${listParams(page, limit, status)}`,
    );
    return response.data.data;
  },

  async getMentorEvaluations(
    status?: EvaluationStatus,
    page = 1,
    limit = 10,
  ): Promise<EvaluationListResponse> {
    const response = await api.get(
      `/evaluations/mentor?${listParams(page, limit, status)}`,
    );
    return response.data.data;
  },

  // ===== RUBRIC =====

  async getTaskCriteria(taskId: string): Promise<TaskCriteriaResponse> {
    const response = await api.get(`/evaluations/tasks/${taskId}/criteria`);
    return response.data.data;
  },

  async replaceTaskCriteria(
    taskId: string,
    criteria: EvaluationCriterion[],
  ): Promise<TaskCriteriaResponse> {
    const response = await api.put(`/evaluations/tasks/${taskId}/criteria`, {
      criteria,
    });
    return response.data.data;
  },

  // ===== PUBLIC =====

  async verify(code: string): Promise<EvaluationVerification> {
    const response = await api.get(
      `/evaluations/verify/${encodeURIComponent(code)}`,
    );
    return response.data.data;
  },

  // ===== PRESENTATION HELPERS =====

  getMetricLabel(metric: EvaluationMetric): string {
    switch (metric) {
      case "quality":
        return "Quality";
      case "timeliness":
        return "Timeliness";
      case "completion":
        return "Scope completion";
      case "communication":
        return "Communication";
      case "effort":
        return "Effort";
      case "reliability":
        return "Reliability";
      default:
        return metric;
    }
  },

  /** One line on what each metric is measured from, for the rubric editor. */
  getMetricHint(metric: EvaluationMetric): string {
    switch (metric) {
      case "quality":
        return "Review scores (70%) and the closing rating (30%), minus heavy rework.";
      case "timeliness":
        return "Share of submissions on time, minus a penalty for finishing late.";
      case "completion":
        return "Weighted milestone completion, minus 15 if closed with work outstanding.";
      case "communication":
        return "Check-ins per week against one a week, plus resolved blockers.";
      case "effort":
        return "Hours logged against the weekly commitment or the estimates.";
      case "reliability":
        return "Share of milestones approved first time, minus unresolved blockers.";
      default:
        return "";
    }
  },

  getGradeColor(grade?: EvaluationGrade | null): string {
    switch (grade) {
      case "A":
        return "bg-emerald-100 text-emerald-800";
      case "B":
        return "bg-brand-50 text-brand-700";
      case "C":
        return "bg-amber-100 text-amber-800";
      case "D":
        return "bg-orange-100 text-orange-800";
      case "F":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-700";
    }
  },

  /** Bar colour for a 0-100 criterion score, on the same bands as the grades. */
  getScoreBarColor(score: number | null | undefined): string {
    if (score == null) return "bg-gray-300";
    if (score >= 85) return "bg-emerald-500";
    if (score >= 70) return "bg-brand-500";
    if (score >= 55) return "bg-amber-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  },

  /** Ring tone for the overall score, reusing the progress ring palette. */
  getRingTone(
    score: number | null | undefined,
  ): "on_track" | "brand" | "at_risk" | "overdue" {
    if (score == null) return "brand";
    if (score >= 85) return "on_track";
    if (score >= 55) return "brand";
    if (score >= 40) return "at_risk";
    return "overdue";
  },

  verifyPath(code: string): string {
    return `/verify/${code}`;
  },
};
