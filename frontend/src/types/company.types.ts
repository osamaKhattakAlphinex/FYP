export type CompanySize = "1-10" | "11-50" | "51-200" | "201-500" | "500+";

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
  linkedinUrl: string | null;
}

export interface CompanySocialLinks {
  linkedin: string | null;
  twitter: string | null;
  github: string | null;
  facebook: string | null;
}

export interface CompanyReview {
  id: string;
  studentName: string;
  studentAvatar: string | null;
  taskTitle: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CompanyProfile {
  id: string;
  userId: string;
  companyName: string;
  logo: string | null;
  coverImage: string | null;
  tagline: string;
  about: string;
  industry: string;
  companySize: CompanySize;
  founded: number | null;
  headquarters: string;
  website: string | null;
  email: string;
  phone: string | null;
  isVerified: boolean;
  verificationDate: string | null;
  profileCompletionScore: number;
  status: "Active" | "Inactive" | "Suspended";
  techStack: string[];
  perks: string[];
  socialLinks: CompanySocialLinks;
  teamMembers: TeamMember[];
  activeTasks: number;
  totalTasksPosted: number;
  totalInterns: number;
  avgRating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyTask {
  id: string;
  title: string;
  skills: string[];
  applicants: number;
  deadline: string;
  status: "Active" | "Closed";
}
