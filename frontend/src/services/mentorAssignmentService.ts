import api from "@/lib/api";
import {
  AssignMentorData,
  AssignmentResponseData,
  AssignmentScope,
  AssignmentStatus,
  CompleteMentorshipData,
  MentorAssignment,
  MentorAssignmentsResponse,
  MentorNote,
  MentorSuggestionsResponse,
  RateMentorData,
  UnassignedInternship,
} from "@/types/mentor.types";

export const mentorAssignmentService = {
  // ===== COMPANY =====

  async getSuggestions(applicationId: string): Promise<MentorSuggestionsResponse> {
    const response = await api.get(
      `/mentor-assignments/applications/${applicationId}/suggestions`,
    );
    return response.data.data;
  },

  async assignMentor(
    applicationId: string,
    data: AssignMentorData,
  ): Promise<MentorAssignment> {
    const response = await api.post(
      `/mentor-assignments/applications/${applicationId}`,
      data,
    );
    return response.data.data;
  },

  async getCompanyAssignments(
    page = 1,
    limit = 10,
    scope: AssignmentScope = "all",
    taskId?: string,
  ): Promise<MentorAssignmentsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      scope,
    });
    if (taskId) params.set("taskId", taskId);
    const response = await api.get(`/mentor-assignments/company?${params}`);
    return response.data.data;
  },

  async getUnassignedInternships(): Promise<{
    applications: UnassignedInternship[];
    count: number;
  }> {
    const response = await api.get("/mentor-assignments/company/unassigned");
    return response.data.data;
  },

  async getForApplication(applicationId: string): Promise<MentorAssignment[]> {
    const response = await api.get(`/mentor-assignments/applications/${applicationId}`);
    return response.data.data.assignments;
  },

  async cancel(id: string, reason?: string): Promise<MentorAssignment> {
    const response = await api.put(`/mentor-assignments/${id}/cancel`, { reason });
    return response.data.data;
  },

  // ===== MENTOR =====

  async getMyAssignments(
    scope: AssignmentScope = "all",
    page = 1,
    limit = 10,
  ): Promise<MentorAssignmentsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      scope,
    });
    const response = await api.get(`/mentor-assignments/me?${params}`);
    return response.data.data;
  },

  async respond(
    id: string,
    data: AssignmentResponseData,
  ): Promise<MentorAssignment> {
    const response = await api.put(`/mentor-assignments/${id}/respond`, data);
    return response.data.data;
  },

  async complete(
    id: string,
    data: CompleteMentorshipData,
  ): Promise<MentorAssignment> {
    const response = await api.put(`/mentor-assignments/${id}/complete`, data);
    return response.data.data;
  },

  // ===== STUDENT =====

  async getStudentAssignments(
    scope: AssignmentScope = "all",
    page = 1,
    limit = 10,
  ): Promise<MentorAssignmentsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      scope,
    });
    const response = await api.get(`/mentor-assignments/student?${params}`);
    return response.data.data;
  },

  async rateMentor(id: string, data: RateMentorData): Promise<MentorAssignment> {
    const response = await api.put(`/mentor-assignments/${id}/rate`, data);
    return response.data.data;
  },

  // ===== SHARED =====

  async getAssignment(id: string): Promise<MentorAssignment> {
    const response = await api.get(`/mentor-assignments/${id}`);
    return response.data.data;
  },

  // ===== NOTES =====

  async getNotes(id: string): Promise<{ notes: MentorNote[]; count: number }> {
    const response = await api.get(`/mentor-assignments/${id}/notes`);
    return response.data.data;
  },

  async addNote(id: string, body: string): Promise<MentorNote> {
    const response = await api.post(`/mentor-assignments/${id}/notes`, { body });
    return response.data.data;
  },

  async updateNote(
    id: string,
    noteId: string,
    data: { body?: string; isPinned?: boolean },
  ): Promise<MentorNote> {
    const response = await api.put(
      `/mentor-assignments/${id}/notes/${noteId}`,
      data,
    );
    return response.data.data;
  },

  async deleteNote(id: string, noteId: string): Promise<void> {
    await api.delete(`/mentor-assignments/${id}/notes/${noteId}`);
  },

  // ===== PRESENTATION HELPERS =====

  getStatusColor(status: AssignmentStatus): string {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-800";
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "declined":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  },

  getStatusLabel(status: AssignmentStatus): string {
    switch (status) {
      case "active":
        return "Active";
      case "pending":
        return "Awaiting response";
      case "completed":
        return "Completed";
      case "declined":
        return "Declined";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  },

  /** Notes are only open while the mentorship is live or already finished. */
  canExchangeNotes(status: AssignmentStatus): boolean {
    return status === "active" || status === "completed";
  },

  canMentorRespond(status: AssignmentStatus): boolean {
    return status === "pending";
  },

  canMentorComplete(status: AssignmentStatus): boolean {
    return status === "active";
  },

  canCompanyCancel(status: AssignmentStatus): boolean {
    return status === "pending" || status === "active";
  },

  canStudentRate(assignment: MentorAssignment): boolean {
    return assignment.status === "completed" && assignment.ratings?.student == null;
  },
};
