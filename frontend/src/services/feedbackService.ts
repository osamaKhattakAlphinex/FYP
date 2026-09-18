import api from "@/lib/api";
import type {
  Feedback,
  FeedbackAssistData,
  FeedbackAssistResult,
  FeedbackContext,
  FeedbackData,
  FeedbackDimension,
  FeedbackIssueSeverity,
  FeedbackListResponse,
  FeedbackSummary,
  FeedbackThread,
  UpdateFeedbackData,
} from "@/types/feedback.types";

const listParams = (page: number, limit: number, context?: FeedbackContext) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (context) params.set("context", context);
  return params;
};

export const FEEDBACK_DIMENSIONS: FeedbackDimension[] = [
  "technical",
  "communication",
  "professionalism",
  "problemSolving",
  "teamwork",
];

export const MAX_SUGGESTIONS = 5;
export const MIN_COMBINED_TEXT = 20;

export const feedbackService = {
  // ===== LISTS =====

  async getReceived(context?: FeedbackContext, page = 1, limit = 20): Promise<FeedbackListResponse> {
    const response = await api.get(`/feedback/received?${listParams(page, limit, context)}`);
    return response.data.data;
  },

  async getGiven(context?: FeedbackContext, page = 1, limit = 20): Promise<FeedbackListResponse> {
    const response = await api.get(`/feedback/given?${listParams(page, limit, context)}`);
    return response.data.data;
  },

  async getSummary(studentId: string): Promise<FeedbackSummary> {
    const response = await api.get(`/feedback/students/${studentId}/summary`);
    return response.data.data;
  },

  // ===== THREADS =====

  async getForProgress(progressId: string): Promise<FeedbackThread> {
    const response = await api.get(`/feedback/progress/${progressId}`);
    return response.data.data;
  },

  async getForInterview(interviewId: string): Promise<FeedbackThread> {
    const response = await api.get(`/feedback/interviews/${interviewId}`);
    return response.data.data;
  },

  // ===== ONE RECORD =====

  async create(data: FeedbackData): Promise<Feedback> {
    const response = await api.post("/feedback", data);
    return response.data.data;
  },

  async update(id: string, data: UpdateFeedbackData): Promise<Feedback> {
    const response = await api.put(`/feedback/${id}`, data);
    return response.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/feedback/${id}`);
  },

  async acknowledge(id: string, response?: string): Promise<Feedback> {
    const res = await api.put(`/feedback/${id}/acknowledge`, response ? { response } : {});
    return res.data.data;
  },

  /** AI draft + quality review. Falls back to the platform rules server-side. */
  async assist(data: FeedbackAssistData): Promise<FeedbackAssistResult> {
    const response = await api.post("/feedback/assist", data);
    return response.data.data;
  },

  // ===== PRESENTATION HELPERS =====

  getDimensionLabel(dimension: FeedbackDimension): string {
    switch (dimension) {
      case "technical":
        return "Technical skill";
      case "communication":
        return "Communication";
      case "professionalism":
        return "Professionalism";
      case "problemSolving":
        return "Problem solving";
      case "teamwork":
        return "Teamwork";
      default:
        return dimension;
    }
  },

  getContextLabel(context: FeedbackContext): string {
    return context === "interview" ? "Interview" : "Internship";
  },

  /** "★★★★☆" for 4/5. */
  formatStars(rating: number | null | undefined): string {
    const n = Math.max(0, Math.min(5, Math.round(rating ?? 0)));
    return "★".repeat(n) + "☆".repeat(5 - n);
  },

  getSeverityColor(severity: FeedbackIssueSeverity): string {
    switch (severity) {
      case "critical":
        return "border-red-200 bg-red-50 text-red-800";
      case "warning":
        return "border-amber-200 bg-amber-50 text-amber-900";
      default:
        return "border-border bg-muted text-muted-foreground";
    }
  },

  /** Lines typed into the strengths/improvements boxes, from an AI list. */
  toParagraph(items: string[]): string {
    return items.join("\n");
  },
};
