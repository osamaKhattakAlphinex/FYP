import api from "@/lib/api";
import type {
  CompanyProfile,
  CompanySocialLinks,
  TeamMember,
} from "@/types/company.types";

export const companyService = {
  // Get all public companies
  async getPublicCompanies() {
    const response = await api.get("/companies/public");
    return response.data.data;
  },

  // Get company profile
  async getProfile() {
    const response = await api.get("/companies/profile");
    return response.data.data;
  },

  // Get public company profile
  async getPublicProfile(companyId: string) {
    const response = await api.get(`/companies/public/${companyId}`);
    return response.data.data;
  },

  // Update basic info
  async updateBasicInfo(data: {
    companyName?: string;
    companySize?: string;
    industry?: string;
    foundedYear?: number;
    website?: string;
    description?: string;
    location?: {
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      zipCode?: string;
    };
  }) {
    const response = await api.put("/companies/profile/basic", data);
    return response.data;
  },

  // Update contact info
  async updateContactInfo(data: {
    phone?: string;
    email?: string;
    contactPerson?: {
      name?: string;
      designation?: string;
      email?: string;
      phone?: string;
    };
  }) {
    const response = await api.put("/companies/profile/contact", data);
    return response.data;
  },

  // Update social links
  async updateSocialLinks(links: Partial<CompanySocialLinks>) {
    const response = await api.put("/companies/profile/social-links", links);
    return response.data;
  },

  // Update culture
  async updateCulture(data: {
    values?: string[];
    benefits?: string[];
    workEnvironment?: string;
  }) {
    const response = await api.put("/companies/profile/culture", data);
    return response.data;
  },

  // Team members
  async addTeamMember(data: Omit<TeamMember, "id">) {
    const response = await api.post("/companies/profile/team", data);
    return response.data;
  },

  async updateTeamMember(id: string, data: Partial<TeamMember>) {
    const response = await api.put(`/companies/profile/team/${id}`, data);
    return response.data;
  },

  async deleteTeamMember(id: string) {
    const response = await api.delete(`/companies/profile/team/${id}`);
    return response.data;
  },

  // Upload team member avatar
  async uploadTeamMemberAvatar(file: File) {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await api.post(
      "/companies/profile/team/avatar",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  // Profile visibility
  async updateProfileVisibility(isProfilePublic: boolean) {
    const response = await api.put("/companies/profile/visibility", {
      isProfilePublic,
    });
    return response.data;
  },

  // Upload logo
  async uploadLogo(file: File) {
    const formData = new FormData();
    formData.append("logo", file);

    const response = await api.post("/companies/profile/logo", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Upload cover image
  async uploadCoverImage(file: File) {
    const formData = new FormData();
    formData.append("cover", file);

    const response = await api.post("/companies/profile/cover", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};
