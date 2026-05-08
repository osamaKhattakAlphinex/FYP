import api from "@/lib/api";

export interface RegisterData {
  email: string;
  password: string;
  role: "student" | "company" | "admin" | "mentor";
  name?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  industry?: string;
  companySize?: string;
  website?: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  _id: string;
  email: string;
  role: "student" | "company" | "admin";
  firstName?: string;
  lastName?: string;
  companyName?: string;
  isEmailVerified: boolean;
  createdAt: string;
}

export const authService = {
  // Register
  async register(data: RegisterData) {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  // Login
  async login(data: LoginData) {
    const response = await api.post("/auth/login", data);
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Logout
  async logout() {
    await api.post("/auth/logout");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  // Get current user
  async getCurrentUser(): Promise<User> {
    const response = await api.get("/auth/me");
    return response.data.user;
  },

  // Verify email with token
  async verifyEmail(token: string) {
    const response = await api.get(`/auth/verify-email/${token}`);
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Resend verification email
  async resendVerification(email: string) {
    const response = await api.post("/auth/resend-verification", { email });
    return response.data;
  },

  // Send OTP
  async sendOTP(email: string) {
    const response = await api.post("/auth/send-otp", { email });
    return response.data;
  },

  // Verify OTP
  async verifyOTP(email: string, otp: string) {
    const response = await api.post("/auth/verify-otp", { email, otp });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Forgot password
  async forgotPassword(email: string) {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },

  // Reset password
  async resetPassword(
    token: string,
    password: string,
    confirmPassword: string,
  ) {
    const response = await api.put(`/auth/reset-password/${token}`, {
      password,
      confirmPassword,
    });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Update password
  async updatePassword(currentPassword: string, newPassword: string) {
    const response = await api.put("/auth/update-password", {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  // Delete account
  async deleteAccount(password: string) {
    const response = await api.delete("/auth/delete-account", {
      data: { password },
    });
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return response.data;
  },

  // Google OAuth
  initiateGoogleAuth(role: "student" | "company") {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google?role=${role}`;
  },

  // Get stored user
  getStoredUser(): User | null {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem("token");
  },
};
