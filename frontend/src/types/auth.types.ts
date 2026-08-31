export type UserRole = "student" | "company" | "mentor" | "admin";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  role: UserRole;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  name: string;
  agreeToTerms: boolean;
  // Company-specific fields
  companyName?: string;
  industry?: string;
  companySize?: string;
  website?: string;
  phone?: string;
  // Student-specific fields (for future use)
  firstName?: string;
  lastName?: string;
  // Mentor-specific fields
  headline?: string;
  currentPosition?: string;
  currentCompany?: string;
  yearsOfExperience?: number;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}
