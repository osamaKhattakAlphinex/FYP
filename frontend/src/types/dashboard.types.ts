import { LucideIcon } from "lucide-react";

export interface DashboardStats {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down";
  icon: LucideIcon;
}

export interface RecentActivity {
  id: string;
  type:
    | "application"
    | "task_completed"
    | "certificate"
    | "message"
    | "interview"
    | "hire";
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

export interface UpcomingDeadline {
  id: string;
  taskTitle: string;
  companyName?: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  progress: number;
}

export interface RecommendedTask {
  id: string;
  title: string;
  company: string;
  companyLogo: string;
  matchScore: number;
  skills: string[];
  duration: string;
  compensation: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface ActiveApplication {
  id: string;
  taskTitle: string;
  company: string;
  appliedDate: string;
  status: "pending" | "reviewing" | "shortlisted" | "rejected" | "accepted";
}

export interface CompanyDashboardData {
  stats: DashboardStats[];
  recentActivities: RecentActivity[];
  activeTasks: any[];
  recentApplications: any[];
}

export interface StudentDashboardData {
  stats: DashboardStats[];
  recentActivities: RecentActivity[];
  upcomingDeadlines: UpcomingDeadline[];
  recommendedTasks: RecommendedTask[];
  activeApplications: ActiveApplication[];
}
