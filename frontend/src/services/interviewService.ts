import { Video, Phone, MapPin, type LucideIcon } from "lucide-react";
import api from "@/lib/api";
import {
  Interview,
  InterviewMode,
  InterviewScope,
  InterviewStatus,
  InterviewStats,
  InterviewsResponse,
  ScheduleInterviewData,
  RescheduleData,
  CancelData,
  CompleteData,
  StudentFeedbackData,
} from "@/types/interview.types";

export const interviewService = {
  // ===== COMPANY =====

  async schedule(
    applicationId: string,
    data: ScheduleInterviewData,
  ): Promise<Interview> {
    const response = await api.post(
      `/interviews/applications/${applicationId}`,
      data,
    );
    return response.data.data;
  },

  async complete(id: string, data: CompleteData): Promise<Interview> {
    const response = await api.put(`/interviews/${id}/complete`, data);
    return response.data.data;
  },

  async getCompanyStats(): Promise<InterviewStats> {
    const response = await api.get("/interviews/company/stats");
    return response.data.data;
  },

  // ===== STUDENT =====

  async submitStudentFeedback(
    id: string,
    data: StudentFeedbackData,
  ): Promise<Interview> {
    const response = await api.put(`/interviews/${id}/feedback`, data);
    return response.data.data;
  },

  // ===== EITHER ROLE =====

  async reschedule(id: string, data: RescheduleData): Promise<Interview> {
    const response = await api.put(`/interviews/${id}/reschedule`, data);
    return response.data.data;
  },

  async cancel(id: string, data: CancelData): Promise<Interview> {
    const response = await api.put(`/interviews/${id}/cancel`, data);
    return response.data.data;
  },

  async getMyInterviews(
    scope: InterviewScope = "upcoming",
    page: number = 1,
    limit: number = 10,
  ): Promise<InterviewsResponse> {
    const params = new URLSearchParams({
      scope,
      page: page.toString(),
      limit: limit.toString(),
    });
    const response = await api.get(`/interviews/me?${params}`);
    return response.data.data;
  },

  async getInterview(id: string): Promise<Interview> {
    const response = await api.get(`/interviews/${id}`);
    return response.data.data;
  },

  // ===== PRESENTATION HELPERS =====

  formatScheduledAt(iso?: string | null, timezone?: string): string {
    if (!iso) return "—";
    try {
      const formatted = new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: timezone || undefined,
      });
      return timezone ? `${formatted} (${timezone})` : formatted;
    } catch {
      return new Date(iso).toLocaleString();
    }
  },

  getModeIcon(mode: InterviewMode): LucideIcon {
    switch (mode) {
      case "video":
        return Video;
      case "phone":
        return Phone;
      case "onsite":
        return MapPin;
      default:
        return Video;
    }
  },

  getModeLabel(mode: InterviewMode): string {
    switch (mode) {
      case "video":
        return "Video call";
      case "phone":
        return "Phone call";
      case "onsite":
        return "On-site";
      default:
        return mode;
    }
  },

  getStatusColor(status: InterviewStatus): string {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "rescheduled":
        return "bg-amber-100 text-amber-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "no_show":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  },

  getStatusLabel(status: InterviewStatus): string {
    switch (status) {
      case "scheduled":
        return "Scheduled";
      case "rescheduled":
        return "Rescheduled";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "no_show":
        return "No show";
      default:
        return status;
    }
  },
};
