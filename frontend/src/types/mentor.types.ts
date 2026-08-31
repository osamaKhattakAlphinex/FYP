// Module 7 — Mentor Assignment.
// Shapes mirror the backend toJSON() output: `_id` alias plus nested objects.

export type ExpertiseLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert";
export type AvailabilityStatus = "available" | "limited" | "unavailable";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type AssignmentStatus =
  | "pending"
  | "active"
  | "declined"
  | "completed"
  | "cancelled";
export type AssignmentScope = "all" | "pending" | "active" | "completed" | "closed";
export type NoteAuthorRole = "mentor" | "student";

export interface MentorExpertise {
  _id: string;
  id: string;
  mentorId: string;
  name: string;
  level: ExpertiseLevel;
  yearsOfExperience?: number | null;
}

export interface Mentor {
  _id: string;
  id: string;
  userId: string;
  email?: string;
  firstName: string;
  lastName: string;
  profilePicture?: string | null;
  headline?: string | null;
  bio?: string | null;
  phone?: string | null;
  currentPosition?: string | null;
  currentCompany?: string | null;
  yearsOfExperience: number;
  location: { city?: string; country?: string };
  social: { linkedin?: string; github?: string; portfolio?: string };
  availability: {
    status: AvailabilityStatus;
    maxActiveMentees: number;
    activeMenteeCount: number;
    hasCapacity: boolean;
  };
  verification: {
    status: VerificationStatus;
    note?: string;
    verifiedAt?: string;
    isVerified: boolean;
  };
  stats: {
    totalMentees: number;
    completedMentorships: number;
    averageRating: number;
    totalRatings: number;
  };
  profileCompletion: number;
  isProfilePublic: boolean;
  expertise?: MentorExpertise[];
  createdAt?: string;
  updatedAt?: string;
}

/** A mentor as returned by the suggestions endpoint, with AI ranking attached. */
export interface MentorSuggestion extends Mentor {
  matchScore: number | null;
  matchReasons: string[];
  matchedSkills: string[];
  missingSkills: string[];
}

export interface MentorSuggestionsResponse {
  applicationId: string;
  taskTitle: string;
  /** false when the AI service was unreachable and the fallback ordering was used. */
  aiRanked: boolean;
  mentors: MentorSuggestion[];
}

export interface AssignmentHistoryEntry {
  _id: string;
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason?: string | null;
  createdAt: string;
}

export interface MentorNote {
  _id: string;
  id: string;
  assignmentId: string;
  authorUserId?: string | null;
  authorRole: NoteAuthorRole;
  authorName?: string | null;
  body: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; avatar?: string | null };
}

export interface MentorAssignment {
  _id: string;
  id: string;
  applicationId: string;
  mentorId: string;
  studentId: string;
  taskId: string;
  companyId: string;
  status: AssignmentStatus;
  matchScore?: number | null;
  assignmentNote?: string | null;
  declineReason?: string | null;
  cancellationReason?: string | null;
  respondedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  lastNoteAt?: string | null;
  ratings: { student?: number; mentor?: number };
  feedback: { student?: string; mentor?: string };
  createdAt: string;
  updatedAt: string;

  // Populated relations
  mentor?: Mentor;
  student?: {
    _id: string;
    id: string;
    firstName: string;
    lastName: string;
    headline?: string | null;
    profilePicture?: string | null;
    locationCity?: string | null;
    locationCountry?: string | null;
    profileCompletion?: number;
  };
  company?: {
    _id: string;
    id: string;
    companyName: string;
    logo?: string | null;
    industry?: string | null;
    contactEmail?: string | null;
  };
  task?: {
    _id: string;
    id: string;
    title: string;
    category?: string;
    experienceLevel?: string;
    status?: string;
  };
  application?: { _id: string; id: string; status: string };
  statusHistory?: AssignmentHistoryEntry[];
  notes?: MentorNote[];
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalAssignments: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

export interface MentorAssignmentsResponse {
  assignments: MentorAssignment[];
  pagination: Pagination;
}

export interface MentorsResponse {
  mentors: Mentor[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalMentors: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
}

export interface AdminMentorsResponse extends MentorsResponse {
  statusCounts: Record<VerificationStatus, number>;
}

export interface UnassignedInternship {
  applicationId: string;
  _id: string;
  decidedAt?: string | null;
  task: { _id: string; id: string; title: string; category?: string; experienceLevel?: string } | null;
  student: {
    _id: string;
    id: string;
    firstName: string;
    lastName: string;
    headline?: string | null;
    profilePicture?: string | null;
  } | null;
}

export interface MentorStats {
  statusCounts: Record<AssignmentStatus, number>;
  totalAssignments: number;
  activeMentees: number;
  capacity: { max: number; used: number; remaining: number };
  averageRating: number;
  totalRatings: number;
  verificationStatus: VerificationStatus;
  profileCompletion: number;
}

// ----- request payloads -----

export interface UpdateMentorProfileData {
  firstName?: string;
  lastName?: string;
  headline?: string;
  bio?: string;
  phone?: string;
  currentPosition?: string;
  currentCompany?: string;
  yearsOfExperience?: number;
  location?: { city?: string; country?: string };
  social?: { linkedin?: string; github?: string; portfolio?: string };
}

export interface ExpertiseData {
  name: string;
  level?: ExpertiseLevel;
  yearsOfExperience?: number | null;
}

export interface AvailabilityData {
  availabilityStatus?: AvailabilityStatus;
  maxActiveMentees?: number;
}

export interface AssignMentorData {
  mentorId: string;
  matchScore?: number | null;
  assignmentNote?: string;
}

export interface AssignmentResponseData {
  action: "accept" | "decline";
  reason?: string;
}

export interface CompleteMentorshipData {
  mentorRating?: number;
  mentorFeedback?: string;
}

export interface RateMentorData {
  studentRating: number;
  studentFeedback?: string;
}

export interface VerificationReviewData {
  status: VerificationStatus;
  note?: string;
}
