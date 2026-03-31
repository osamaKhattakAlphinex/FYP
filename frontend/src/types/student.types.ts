export interface StudentProfile {
  id: string;
  userId: string;
  fullName: string;
  profilePicture: string | null;
  headline: string;
  about: string;
  university: string;
  degree: string;
  major: string;
  graduationYear: number;
  cgpa: number | null;
  city: string;
  country: string;
  profileCompletionScore: number;
  isAvailable: boolean;
  skills: Skill[];
  education: Education[];
  experience: Experience[];
  projects: Project[];
  certificates: Certificate[];
  socialLinks: SocialLinks;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  name: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: number;
  endYear: number | null;
  isCurrentlyStudying: boolean;
  grade: string | null;
  description: string | null;
}

export interface Experience {
  id: string;
  title: string;
  company: string;
  employmentType: "Full-time" | "Part-time" | "Internship" | "Freelance";
  startDate: string;
  endDate: string | null;
  isCurrentlyWorking: boolean;
  description: string;
  skills: string[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  projectUrl: string | null;
  githubUrl: string | null;
  thumbnailUrl: string | null;
  startDate: string;
  endDate: string | null;
}

export interface Certificate {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  expiryDate: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  isNexInternCertificate: boolean;
}

export interface SocialLinks {
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  twitter: string | null;
}
