export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "interview_scheduled"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface ApplicationAttachment {
  _id: string;
  name: string;
  url: string;
  type: string;
}

export interface ApplicationStatusHistoryEntry {
  _id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  reason?: string | null;
  changedByUserId?: string | null;
  createdAt: string;
}

export interface ApplicationStudentSummary {
  _id: string;
  firstName: string;
  lastName: string;
  headline?: string | null;
  profilePicture?: string | null;
  locationCity?: string | null;
  locationCountry?: string | null;
  profileCompletion?: number;
  bio?: string | null;
  resumeUrl?: string | null;
  skills?: Array<{ _id: string; name: string; level?: string }>;
  education?: Array<Record<string, unknown>>;
}

export interface ApplicationTaskSummary {
  _id: string;
  title: string;
  category?: string;
  type?: "internship" | "project" | "freelance";
  workType?: "remote" | "onsite" | "hybrid";
  experienceLevel?: "entry" | "intermediate" | "expert";
  applicationDeadline?: string;
  startDate?: string;
  status?: string;
  budget?: {
    type: "fixed" | "hourly" | "unpaid";
    amount?: { min?: number; max?: number };
    currency: string;
  };
  budgetDisplay?: string;
  company?: {
    _id: string;
    companyName: string;
    logo?: string | null;
    industry?: string;
    locationCity?: string | null;
    locationCountry?: string | null;
    verificationIsVerified?: boolean;
  };
}

export interface Application {
  _id: string;
  taskId: string;
  task?: ApplicationTaskSummary;
  studentId: string;
  student?: ApplicationStudentSummary;
  coverLetter: string;
  proposed: {
    rate?: number;
    currency: string;
  };
  expectedStartDate?: string | null;
  availabilityHoursPerWeek?: number | null;
  resumeUrl?: string | null;
  portfolioUrl?: string | null;
  status: ApplicationStatus;
  matchScore?: number | null;
  rejectionReason?: string | null;
  companyNotes?: string | null;
  viewedByCompanyAt?: string | null;
  submittedAt: string;
  decidedAt?: string | null;
  attachments: ApplicationAttachment[];
  statusHistory?: ApplicationStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateApplicationData {
  coverLetter: string;
  proposed?: {
    rate?: number;
    currency?: string;
  };
  proposedRate?: number;
  proposedCurrency?: string;
  expectedStartDate?: string;
  availabilityHoursPerWeek?: number;
  resumeUrl?: string;
  portfolioUrl?: string;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
}

export interface UpdateApplicationStatusData {
  status: ApplicationStatus;
  reason?: string;
}

export interface ApplicationsResponse {
  applications: Application[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalApplications: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
}

export interface ApplicationStats {
  statusCounts: Record<ApplicationStatus, number>;
  averageMatchScore: number;
  dailyTrend: Array<{ date: string; count: number }>;
}
