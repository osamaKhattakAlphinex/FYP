import api from "@/lib/api";
import {
  AdminMentorsResponse,
  AvailabilityData,
  ExpertiseData,
  Mentor,
  MentorExpertise,
  MentorStats,
  MentorsResponse,
  UpdateMentorProfileData,
  VerificationReviewData,
  VerificationStatus,
  AvailabilityStatus,
} from "@/types/mentor.types";

export const mentorService = {
  // ===== MENTOR SELF-SERVICE =====

  async getMyProfile(): Promise<Mentor> {
    const response = await api.get("/mentors/me");
    return response.data.data;
  },

  async updateMyProfile(data: UpdateMentorProfileData): Promise<Mentor> {
    const response = await api.put("/mentors/me", data);
    return response.data.data;
  },

  async getMyStats(): Promise<MentorStats> {
    const response = await api.get("/mentors/me/stats");
    return response.data.data;
  },

  async updateAvailability(data: AvailabilityData) {
    const response = await api.put("/mentors/me/availability", data);
    return response.data.data;
  },

  async updateVisibility(isProfilePublic: boolean) {
    const response = await api.put("/mentors/me/visibility", { isProfilePublic });
    return response.data.data;
  },

  async uploadAvatar(file: File): Promise<{ profilePicture: string }> {
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await api.post("/mentors/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
  },

  // ===== EXPERTISE =====

  async addExpertise(data: ExpertiseData): Promise<MentorExpertise> {
    const response = await api.post("/mentors/me/expertise", data);
    return response.data.data;
  },

  async updateExpertise(
    expertiseId: string,
    data: Partial<ExpertiseData>,
  ): Promise<MentorExpertise> {
    const response = await api.put(`/mentors/me/expertise/${expertiseId}`, data);
    return response.data.data;
  },

  async deleteExpertise(expertiseId: string): Promise<void> {
    await api.delete(`/mentors/me/expertise/${expertiseId}`);
  },

  // ===== PUBLIC DIRECTORY =====

  async getPublicMentors(
    page = 1,
    limit = 12,
    search = "",
    expertise = "",
  ): Promise<MentorsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search,
      expertise,
    });
    const response = await api.get(`/mentors/public?${params}`);
    return response.data.data;
  },

  async getPublicMentor(mentorId: string): Promise<Mentor> {
    const response = await api.get(`/mentors/public/${mentorId}`);
    return response.data.data;
  },

  // ===== ADMIN VERIFICATION =====

  async getMentorsForAdmin(
    page = 1,
    limit = 20,
    status: VerificationStatus | "all" = "all",
    search = "",
  ): Promise<AdminMentorsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      status,
      search,
    });
    const response = await api.get(`/admin/mentors?${params}`);
    return response.data.data;
  },

  async reviewVerification(
    mentorId: string,
    data: VerificationReviewData,
  ): Promise<Mentor> {
    const response = await api.put(`/admin/mentors/${mentorId}/verify`, data);
    return response.data.data;
  },

  // ===== PRESENTATION HELPERS =====

  getVerificationColor(status: VerificationStatus): string {
    switch (status) {
      case "approved":
        return "bg-emerald-100 text-emerald-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-amber-100 text-amber-800";
    }
  },

  getVerificationLabel(status: VerificationStatus): string {
    switch (status) {
      case "approved":
        return "Verified";
      case "rejected":
        return "Not approved";
      default:
        return "Awaiting verification";
    }
  },

  getAvailabilityColor(status: AvailabilityStatus): string {
    switch (status) {
      case "available":
        return "bg-emerald-100 text-emerald-800";
      case "limited":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-700";
    }
  },

  getAvailabilityLabel(status: AvailabilityStatus): string {
    switch (status) {
      case "available":
        return "Available";
      case "limited":
        return "Limited availability";
      default:
        return "Not taking mentees";
    }
  },

  fullName(mentor?: Partial<Mentor> | null): string {
    if (!mentor) return "Unknown mentor";
    return [mentor.firstName, mentor.lastName].filter(Boolean).join(" ") || "Unknown mentor";
  },
};
