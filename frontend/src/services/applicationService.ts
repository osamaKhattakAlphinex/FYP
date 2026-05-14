import api from "@/lib/api";
import {
  Application,
  ApplicationsResponse,
  ApplicationStats,
  ApplicationStatus,
  CreateApplicationData,
  UpdateApplicationStatusData,
} from "@/types/application.types";

type RawStats = {
  totalApplications: number;
  applicationsByStatus: Array<{ _id: ApplicationStatus; count: number }>;
  averageMatchScore: number;
  last7DaysTrend: Array<{ date: string; count: number }>;
};

const EMPTY_STATUS_COUNTS: Record<ApplicationStatus, number> = {
  submitted: 0,
  under_review: 0,
  shortlisted: 0,
  interview_scheduled: 0,
  accepted: 0,
  rejected: 0,
  withdrawn: 0,
};

export const applicationService = {
  // ===== STUDENT =====

  async applyToTask(
    taskId: string,
    data: CreateApplicationData,
  ): Promise<Application> {
    const response = await api.post(`/applications/tasks/${taskId}`, data);
    return response.data.data;
  },

  async uploadAttachments(
    files: File[],
  ): Promise<Array<{ name: string; url: string; type: string; size?: number }>> {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const response = await api.post(
      "/applications/attachments/upload",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data.data;
  },

  async getMyApplications(
    page: number = 1,
    limit: number = 10,
    status: string = "all",
    sortBy: string = "submittedAt",
    sortOrder: "asc" | "desc" = "desc",
  ): Promise<ApplicationsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      status,
      sortBy,
      sortOrder,
    });

    const response = await api.get(`/applications/me?${params}`);
    return response.data.data;
  },

  async getMyApplication(id: string): Promise<Application> {
    const response = await api.get(`/applications/${id}`);
    return response.data.data;
  },

  async updateMyApplication(
    id: string,
    data: Partial<CreateApplicationData>,
  ): Promise<Application> {
    const response = await api.put(`/applications/${id}`, data);
    return response.data.data;
  },

  async withdrawMyApplication(id: string): Promise<Application> {
    const response = await api.post(`/applications/${id}/withdraw`);
    return response.data.data;
  },

  // ===== COMPANY =====

  async getApplicationsForTask(
    taskId: string,
    page: number = 1,
    limit: number = 10,
    status: string = "all",
    sortBy: string = "submittedAt",
    sortOrder: "asc" | "desc" = "desc",
  ): Promise<ApplicationsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      status,
      sortBy,
      sortOrder,
    });

    const response = await api.get(
      `/applications/tasks/${taskId}?${params}`,
    );
    return response.data.data;
  },

  async getApplication(id: string): Promise<Application> {
    const response = await api.get(`/applications/${id}`);
    return response.data.data;
  },

  async updateStatus(
    id: string,
    payload: UpdateApplicationStatusData,
  ): Promise<Application> {
    const response = await api.put(`/applications/${id}/status`, payload);
    return response.data.data;
  },

  async updateNotes(id: string, companyNotes: string): Promise<Application> {
    const response = await api.put(`/applications/${id}/notes`, {
      companyNotes,
    });
    return response.data.data;
  },

  async getStats(): Promise<ApplicationStats> {
    const response = await api.get("/applications/company/stats");
    const raw: RawStats = response.data.data;

    const statusCounts: Record<ApplicationStatus, number> = {
      ...EMPTY_STATUS_COUNTS,
    };
    (raw.applicationsByStatus || []).forEach((entry) => {
      statusCounts[entry._id] = Number(entry.count) || 0;
    });

    return {
      statusCounts,
      averageMatchScore: Number(raw.averageMatchScore) || 0,
      dailyTrend: (raw.last7DaysTrend || []).map((d) => ({
        date: d.date,
        count: Number(d.count) || 0,
      })),
    };
  },

  // ===== PRESENTATION HELPERS =====

  getStatusColor(status: ApplicationStatus): string {
    switch (status) {
      case "submitted":
        return "bg-gray-100 text-gray-800";
      case "under_review":
        return "bg-blue-100 text-blue-800";
      case "shortlisted":
        return "bg-indigo-100 text-indigo-800";
      case "interview_scheduled":
        return "bg-purple-100 text-purple-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "withdrawn":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  },

  getStatusLabel(status: ApplicationStatus): string {
    switch (status) {
      case "submitted":
        return "Submitted";
      case "under_review":
        return "Under Review";
      case "shortlisted":
        return "Shortlisted";
      case "interview_scheduled":
        return "Interview Scheduled";
      case "accepted":
        return "Accepted";
      case "rejected":
        return "Rejected";
      case "withdrawn":
        return "Withdrawn";
      default:
        return status;
    }
  },

  canStudentWithdraw(status: ApplicationStatus): boolean {
    return ["submitted", "under_review", "shortlisted"].includes(status);
  },
};
