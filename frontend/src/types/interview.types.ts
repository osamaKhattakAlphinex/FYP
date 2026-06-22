export type InterviewMode = "video" | "phone" | "onsite";

export type InterviewStatus =
  | "scheduled"
  | "rescheduled"
  | "completed"
  | "cancelled"
  | "no_show";

export interface InterviewTaskSummary {
  _id: string;
  title: string;
  category?: string;
  workType?: "remote" | "onsite" | "hybrid";
}

export interface InterviewCompanySummary {
  _id: string;
  companyName: string;
  logo?: string | null;
  industry?: string;
  contactEmail?: string | null;
}

export interface InterviewStudentSummary {
  _id: string;
  firstName: string;
  lastName: string;
  headline?: string | null;
  profilePicture?: string | null;
  locationCity?: string | null;
  locationCountry?: string | null;
  user?: { id: string; email: string };
}

export interface InterviewApplicationSummary {
  _id: string;
  status: string;
}

// Matches the backend Interview.toJSON() output
export interface Interview {
  _id: string;
  id: string;
  applicationId: string;
  taskId: string;
  studentId: string;
  companyId: string;
  scheduledAt: string;
  durationMinutes: number;
  mode: InterviewMode;
  meeting: {
    link?: string;
    location?: string;
    phoneNumber?: string;
  };
  agenda?: string | null;
  status: InterviewStatus;
  rescheduleCount: number;
  cancellationReason?: string | null;
  companyFeedback?: string | null;
  studentFeedback?: string | null;
  ratings: {
    company?: number;
    student?: number;
  };
  timezone: string;
  createdByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  task?: InterviewTaskSummary;
  company?: InterviewCompanySummary;
  student?: InterviewStudentSummary;
  application?: InterviewApplicationSummary;
}

export interface ScheduleInterviewData {
  scheduledAt: string;
  durationMinutes?: number;
  mode: InterviewMode;
  meeting?: {
    link?: string;
    location?: string;
    phoneNumber?: string;
  };
  agenda?: string;
  timezone?: string;
}

export interface RescheduleData {
  scheduledAt: string;
  reason?: string;
}

export interface CancelData {
  reason: string;
}

export interface CompleteData {
  companyFeedback?: string;
  companyRating?: number;
}

export interface StudentFeedbackData {
  studentFeedback?: string;
  studentRating?: number;
}

export type InterviewScope = "upcoming" | "past" | "all";

export interface InterviewsResponse {
  interviews: Interview[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalInterviews: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
}

export interface InterviewStats {
  statusCounts: Record<InterviewStatus, number>;
  upcomingThisWeek: number;
  averageCompanyRating: number;
  averageStudentRating: number;
}
