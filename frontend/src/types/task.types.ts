export type TaskDifficulty = "Beginner" | "Intermediate" | "Advanced";

export type TaskStatus = "Active" | "Closed" | "Draft";

export type TaskDuration =
  | "1-2 weeks"
  | "2-4 weeks"
  | "1-2 months"
  | "2-3 months";

export interface Task {
  id: string;
  companyId: string;
  companyName: string;
  companyLogo: string | null;
  title: string;
  description: string;
  requiredSkills: string[];
  difficulty: TaskDifficulty;
  duration: TaskDuration;
  deadline: string;
  deliverables: string[];
  isPaid: boolean;
  compensation: number | null;
  applicants: number;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TaskApplication {
  id: string;
  taskId: string;
  studentId: string;
  studentName: string;
  studentAvatar: string | null;
  coverLetter: string;
  status: "Pending" | "Accepted" | "Rejected";
  appliedAt: string;
}
