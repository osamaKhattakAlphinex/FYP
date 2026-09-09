import api from "@/lib/api";
import type {
  CompleteProgressData,
  CreateUpdateData,
  HealthStatus,
  InternshipProgress,
  MilestoneData,
  MilestoneStatus,
  MilestoneStatusData,
  MilestoneSubmission,
  ProgressListResponse,
  ProgressMilestone,
  ProgressOverview,
  ProgressPerspective,
  ProgressReport,
  ProgressScope,
  ProgressStatus,
  ProgressStatusChangeData,
  ProgressTimeLog,
  ProgressUpdateEntry,
  ReviewMilestoneData,
  SubmitMilestoneData,
  TimeLogData,
  TimeLogsResponse,
  UpdateProgressPlanData,
  UpdatesResponse,
} from "@/types/progress.types";

const listParams = (
  page: number,
  limit: number,
  scope: ProgressScope,
  health?: HealthStatus,
  taskId?: string,
) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    scope,
  });
  if (health) params.set("health", health);
  if (taskId) params.set("taskId", taskId);
  return params;
};

export const progressService = {
  // ===== ENTRY POINT =====

  /** Opens (creating on first call) the internship record for an application. */
  async getForApplication(applicationId: string): Promise<InternshipProgress> {
    const response = await api.get(`/progress/applications/${applicationId}`);
    return response.data.data;
  },

  // ===== LISTS =====

  async getStudentProgress(
    scope: ProgressScope = "all",
    page = 1,
    limit = 10,
    health?: HealthStatus,
  ): Promise<ProgressListResponse> {
    const response = await api.get(
      `/progress/student?${listParams(page, limit, scope, health)}`,
    );
    return response.data.data;
  },

  async getCompanyProgress(
    scope: ProgressScope = "all",
    page = 1,
    limit = 10,
    health?: HealthStatus,
    taskId?: string,
  ): Promise<ProgressListResponse> {
    const response = await api.get(
      `/progress/company?${listParams(page, limit, scope, health, taskId)}`,
    );
    return response.data.data;
  },

  async getMentorProgress(
    scope: ProgressScope = "all",
    page = 1,
    limit = 10,
    health?: HealthStatus,
  ): Promise<ProgressListResponse> {
    const response = await api.get(
      `/progress/mentor?${listParams(page, limit, scope, health)}`,
    );
    return response.data.data;
  },

  /** Aggregate counters scoped to whoever is logged in. */
  async getOverview(): Promise<ProgressOverview> {
    const response = await api.get("/progress/overview");
    return response.data.data;
  },

  // ===== SINGLE RECORD =====

  async getProgress(id: string): Promise<InternshipProgress> {
    const response = await api.get(`/progress/${id}`);
    return response.data.data;
  },

  async getReport(id: string): Promise<ProgressReport> {
    const response = await api.get(`/progress/${id}/report`);
    return response.data.data;
  },

  async updatePlan(
    id: string,
    data: UpdateProgressPlanData,
  ): Promise<InternshipProgress> {
    const response = await api.put(`/progress/${id}`, data);
    return response.data.data;
  },

  async changeStatus(
    id: string,
    data: ProgressStatusChangeData,
  ): Promise<InternshipProgress> {
    const response = await api.put(`/progress/${id}/status`, data);
    return response.data.data;
  },

  async complete(
    id: string,
    data: CompleteProgressData,
  ): Promise<InternshipProgress> {
    const response = await api.put(`/progress/${id}/complete`, data);
    return response.data.data;
  },

  // ===== MILESTONES =====

  async getMilestones(id: string): Promise<ProgressMilestone[]> {
    const response = await api.get(`/progress/${id}/milestones`);
    return response.data.data.milestones;
  },

  async createMilestone(
    id: string,
    data: MilestoneData,
  ): Promise<ProgressMilestone> {
    const response = await api.post(`/progress/${id}/milestones`, data);
    return response.data.data;
  },

  async updateMilestone(
    id: string,
    milestoneId: string,
    data: Partial<MilestoneData>,
  ): Promise<ProgressMilestone> {
    const response = await api.put(
      `/progress/${id}/milestones/${milestoneId}`,
      data,
    );
    return response.data.data;
  },

  async deleteMilestone(id: string, milestoneId: string): Promise<void> {
    await api.delete(`/progress/${id}/milestones/${milestoneId}`);
  },

  async reorderMilestones(
    id: string,
    milestoneIds: string[],
  ): Promise<ProgressMilestone[]> {
    const response = await api.put(`/progress/${id}/milestones/reorder`, {
      milestoneIds,
    });
    return response.data.data.milestones;
  },

  async startMilestone(
    id: string,
    milestoneId: string,
  ): Promise<ProgressMilestone> {
    const response = await api.put(
      `/progress/${id}/milestones/${milestoneId}/start`,
    );
    return response.data.data;
  },

  async submitMilestone(
    id: string,
    milestoneId: string,
    data: SubmitMilestoneData,
  ): Promise<{ submission: MilestoneSubmission; milestone: ProgressMilestone }> {
    const response = await api.post(
      `/progress/${id}/milestones/${milestoneId}/submit`,
      data,
    );
    return response.data.data;
  },

  async reviewMilestone(
    id: string,
    milestoneId: string,
    data: ReviewMilestoneData,
  ): Promise<{
    milestone: ProgressMilestone;
    submission: MilestoneSubmission | null;
  }> {
    const response = await api.put(
      `/progress/${id}/milestones/${milestoneId}/review`,
      data,
    );
    return response.data.data;
  },

  async setMilestoneStatus(
    id: string,
    milestoneId: string,
    data: MilestoneStatusData,
  ): Promise<ProgressMilestone> {
    const response = await api.put(
      `/progress/${id}/milestones/${milestoneId}/status`,
      data,
    );
    return response.data.data;
  },

  async getMilestoneSubmissions(
    id: string,
    milestoneId: string,
  ): Promise<MilestoneSubmission[]> {
    const response = await api.get(
      `/progress/${id}/milestones/${milestoneId}/submissions`,
    );
    return response.data.data.submissions;
  },

  async getPendingSubmissions(id: string): Promise<MilestoneSubmission[]> {
    const response = await api.get(`/progress/${id}/submissions`);
    return response.data.data.submissions;
  },

  // ===== TIME LOGS =====

  async getTimeLogs(
    id: string,
    filters: { milestoneId?: string; from?: string; to?: string } = {},
  ): Promise<TimeLogsResponse> {
    const params = new URLSearchParams();
    if (filters.milestoneId) params.set("milestoneId", filters.milestoneId);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    const qs = params.toString();
    const response = await api.get(
      `/progress/${id}/time-logs${qs ? `?${qs}` : ""}`,
    );
    return response.data.data;
  },

  async createTimeLog(id: string, data: TimeLogData): Promise<ProgressTimeLog> {
    const response = await api.post(`/progress/${id}/time-logs`, data);
    return response.data.data;
  },

  async updateTimeLog(
    id: string,
    logId: string,
    data: Partial<TimeLogData>,
  ): Promise<ProgressTimeLog> {
    const response = await api.put(`/progress/${id}/time-logs/${logId}`, data);
    return response.data.data;
  },

  async deleteTimeLog(id: string, logId: string): Promise<void> {
    await api.delete(`/progress/${id}/time-logs/${logId}`);
  },

  // ===== UPDATES =====

  async getUpdates(
    id: string,
    filters: { type?: string; open?: boolean } = {},
  ): Promise<UpdatesResponse> {
    const params = new URLSearchParams();
    if (filters.type) params.set("type", filters.type);
    if (filters.open) params.set("open", "true");
    const qs = params.toString();
    const response = await api.get(`/progress/${id}/updates${qs ? `?${qs}` : ""}`);
    return response.data.data;
  },

  async createUpdate(
    id: string,
    data: CreateUpdateData,
  ): Promise<ProgressUpdateEntry> {
    const response = await api.post(`/progress/${id}/updates`, data);
    return response.data.data;
  },

  async editUpdate(
    id: string,
    updateId: string,
    data: { body?: string; percentSelfReported?: number | null },
  ): Promise<ProgressUpdateEntry> {
    const response = await api.put(`/progress/${id}/updates/${updateId}`, data);
    return response.data.data;
  },

  async resolveUpdate(
    id: string,
    updateId: string,
    resolutionNote?: string,
  ): Promise<ProgressUpdateEntry> {
    const response = await api.put(
      `/progress/${id}/updates/${updateId}/resolve`,
      { resolutionNote },
    );
    return response.data.data;
  },

  async deleteUpdate(id: string, updateId: string): Promise<void> {
    await api.delete(`/progress/${id}/updates/${updateId}`);
  },

  // ===== PRESENTATION HELPERS =====

  getStatusLabel(status: ProgressStatus): string {
    switch (status) {
      case "not_started":
        return "Not started";
      case "in_progress":
        return "In progress";
      case "paused":
        return "Paused";
      case "completed":
        return "Completed";
      case "abandoned":
        return "Closed early";
      default:
        return status;
    }
  },

  getStatusColor(status: ProgressStatus): string {
    switch (status) {
      case "in_progress":
        return "bg-brand-50 text-brand-700";
      case "completed":
        return "bg-emerald-100 text-emerald-800";
      case "paused":
        return "bg-amber-100 text-amber-800";
      case "abandoned":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-700";
    }
  },

  getHealthLabel(health: HealthStatus): string {
    switch (health) {
      case "on_track":
        return "On track";
      case "at_risk":
        return "At risk";
      case "overdue":
        return "Overdue";
      default:
        return health;
    }
  },

  getHealthColor(health: HealthStatus): string {
    switch (health) {
      case "on_track":
        return "bg-emerald-100 text-emerald-800";
      case "at_risk":
        return "bg-amber-100 text-amber-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-700";
    }
  },

  getMilestoneLabel(status: MilestoneStatus): string {
    switch (status) {
      case "pending":
        return "Not started";
      case "in_progress":
        return "In progress";
      case "submitted":
        return "Awaiting review";
      case "changes_requested":
        return "Changes requested";
      case "completed":
        return "Approved";
      case "blocked":
        return "Blocked";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  },

  getMilestoneColor(status: MilestoneStatus): string {
    switch (status) {
      case "completed":
        return "bg-emerald-100 text-emerald-800";
      case "submitted":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-brand-50 text-brand-700";
      case "changes_requested":
        return "bg-amber-100 text-amber-800";
      case "blocked":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-500";
      default:
        return "bg-gray-100 text-gray-700";
    }
  },

  getRiskColor(level: string): string {
    switch (level) {
      case "low":
        return "bg-emerald-100 text-emerald-800";
      case "medium":
        return "bg-amber-100 text-amber-800";
      case "high":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-700";
    }
  },

  getUpdateLabel(type: string): string {
    switch (type) {
      case "checkin":
        return "Check-in";
      case "blocker":
        return "Blocker";
      case "risk_flag":
        return "Risk flag";
      case "note":
        return "Note";
      default:
        return type;
    }
  },

  // --- capability mirrors of the backend rules -------------------------
  // The API is always the authority; these only decide what to render, so a
  // stale client shows the wrong button rather than being able to act.

  /** Progress a student can drive forward right now. */
  canStudentAct(progress: InternshipProgress): boolean {
    return (
      progress.status === "not_started" || progress.status === "in_progress"
    );
  },

  canStartMilestone(m: ProgressMilestone): boolean {
    return m.status === "pending" || m.status === "changes_requested";
  },

  canSubmitMilestone(m: ProgressMilestone): boolean {
    return ["pending", "in_progress", "changes_requested"].includes(m.status);
  },

  canReviewMilestone(m: ProgressMilestone): boolean {
    return m.status === "submitted";
  },

  canBlockMilestone(m: ProgressMilestone): boolean {
    return ["pending", "in_progress", "changes_requested", "submitted"].includes(
      m.status,
    );
  },

  /** Which perspective a role gets in the shared workspace component. */
  perspectiveForRole(role?: string | null): ProgressPerspective {
    if (role === "company" || role === "mentor" || role === "admin") return role;
    return "student";
  },
};
