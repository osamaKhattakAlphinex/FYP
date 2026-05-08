import api from "@/lib/api";
import {
  StudentProfile,
  Education,
  Skill,
  Experience,
  Project,
  Certificate,
  SocialLinks,
} from "@/types/student.types";

export interface UpdateBasicInfoData {
  firstName?: string;
  lastName?: string;
  headline?: string;
  phone?: string;
  dateOfBirth?: string;
  bio?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

export const studentService = {
  // Get all public students
  async getPublicStudents() {
    const response = await api.get("/students/public");
    return response.data.data;
  },

  // Get student profile
  async getProfile() {
    const response = await api.get("/students/profile");
    return response.data.data;
  },

  // Update basic info
  async updateBasicInfo(data: UpdateBasicInfoData) {
    const response = await api.put("/students/profile/basic", data);
    return response.data;
  },

  // Education
  async addEducation(data: Omit<Education, "id">) {
    const response = await api.post("/students/profile/education", data);
    return response.data;
  },

  async updateEducation(id: string, data: Partial<Education>) {
    const response = await api.put(`/students/profile/education/${id}`, data);
    return response.data;
  },

  async deleteEducation(id: string) {
    const response = await api.delete(`/students/profile/education/${id}`);
    return response.data;
  },

  // Skills
  async addSkill(data: Omit<Skill, "id">) {
    const response = await api.post("/students/profile/skills", data);
    return response.data;
  },

  async updateSkill(id: string, data: Partial<Skill>) {
    const response = await api.put(`/students/profile/skills/${id}`, data);
    return response.data;
  },

  async deleteSkill(id: string) {
    const response = await api.delete(`/students/profile/skills/${id}`);
    return response.data;
  },

  // Experience
  async addExperience(data: Omit<Experience, "id">) {
    const response = await api.post("/students/profile/experience", data);
    return response.data;
  },

  async updateExperience(id: string, data: Partial<Experience>) {
    const response = await api.put(`/students/profile/experience/${id}`, data);
    return response.data;
  },

  async deleteExperience(id: string) {
    const response = await api.delete(`/students/profile/experience/${id}`);
    return response.data;
  },

  // Projects
  async addProject(data: Omit<Project, "id">) {
    const response = await api.post("/students/profile/projects", data);
    return response.data;
  },

  async updateProject(id: string, data: Partial<Project>) {
    const response = await api.put(`/students/profile/projects/${id}`, data);
    return response.data;
  },

  async deleteProject(id: string) {
    const response = await api.delete(`/students/profile/projects/${id}`);
    return response.data;
  },

  // Certificates
  async addCertificate(data: Omit<Certificate, "id">, file?: File) {
    const formData = new FormData();

    // Append all certificate data
    Object.keys(data).forEach((key) => {
      const value = (data as any)[key];
      if (value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });

    // Append file if provided
    if (file) {
      formData.append("certificateImage", file);
    }

    const response = await api.post(
      "/students/profile/certificates",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  async updateCertificate(id: string, data: Partial<Certificate>, file?: File) {
    const formData = new FormData();

    // Append all certificate data
    Object.keys(data).forEach((key) => {
      const value = (data as any)[key];
      if (value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });

    // Append file if provided
    if (file) {
      formData.append("certificateImage", file);
    }

    const response = await api.put(
      `/students/profile/certificates/${id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  async deleteCertificate(id: string) {
    const response = await api.delete(`/students/profile/certificates/${id}`);
    return response.data;
  },

  async deleteCertificateImage(id: string) {
    const response = await api.delete(
      `/students/profile/certificates/${id}/image`,
    );
    return response.data;
  },

  // Social Links
  async updateSocialLinks(data: Partial<SocialLinks>) {
    const response = await api.put("/students/profile/social-links", data);
    return response.data;
  },

  // Profile Visibility
  async updateProfileVisibility(isProfilePublic: boolean) {
    const response = await api.put("/students/profile/visibility", {
      isProfilePublic,
    });
    return response.data;
  },

  // Resume
  async uploadResume(file: File) {
    const formData = new FormData();
    formData.append("resume", file);

    const response = await api.post("/students/profile/resume", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  async deleteResume() {
    const response = await api.delete("/students/profile/resume");
    return response.data;
  },

  // Avatar
  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await api.post("/students/profile/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Public profile
  async getPublicProfile(studentId: string) {
    const response = await api.get(`/students/public/${studentId}`);
    return response.data.data;
  },
};
