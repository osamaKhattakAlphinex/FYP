import api from "@/lib/api";

export interface Task {
  _id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  companyId: {
    _id: string;
    companyName: string;
    logo?: string;
    industry: string;
    location?: {
      city?: string;
      country?: string;
    };
    isVerified: boolean;
  };
  type: "internship" | "project" | "freelance";
  duration: {
    value: number;
    unit: "days" | "weeks" | "months";
  };
  workType: "remote" | "onsite" | "hybrid";
  experienceLevel: "entry" | "intermediate" | "expert";
  skillsRequired: Array<{
    name: string;
    level: "beginner" | "intermediate" | "advanced";
    required: boolean;
  }>;
  requirements: string[];
  budget: {
    type: "fixed" | "hourly" | "unpaid";
    amount?: {
      min: number;
      max: number;
    };
    currency: string;
  };
  applicationDeadline: string;
  startDate: string;
  endDate?: string;
  status: "draft" | "active" | "paused" | "closed" | "completed";
  isPublic: boolean;
  isFeatured: boolean;
  maxApplications: number;
  applicationCount: number;
  deliverables: string[];
  benefits: string[];
  location?: {
    city?: string;
    state?: string;
    country?: string;
    timezone?: string;
  };
  attachments: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  tags: string[];
  views: number;
  saves: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  closedAt?: string;
  timeRemaining?: {
    days: number;
    hours: number;
    expired: boolean;
  };
  budgetDisplay?: string;
}

export interface TaskFilters {
  category?: string;
  workType?: string;
  experienceLevel?: string;
  budget?: string;
  search?: string;
  skills?: string;
  location?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface TasksResponse {
  tasks: Task[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalTasks: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
}

export interface CreateTaskData {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  type: "internship" | "project" | "freelance";
  duration: {
    value: number;
    unit: "days" | "weeks" | "months";
  };
  workType: "remote" | "onsite" | "hybrid";
  experienceLevel: "entry" | "intermediate" | "expert";
  skillsRequired: Array<{
    name: string;
    level: "beginner" | "intermediate" | "advanced";
    required: boolean;
  }>;
  requirements: string[];
  budget: {
    type: "fixed" | "hourly" | "unpaid";
    amount?: {
      min: number;
      max: number;
    };
    currency: string;
  };
  applicationDeadline: string;
  startDate: string;
  endDate?: string;
  maxApplications?: number;
  deliverables: string[];
  benefits: string[];
  location?: {
    city?: string;
    state?: string;
    country?: string;
    timezone?: string;
  };
  tags: string[];
  status?: "draft" | "active";
}

export interface TaskStats {
  totalActiveTasks: number;
  tasksByCategory: Array<{
    _id: string;
    count: number;
  }>;
  tasksByWorkType: Array<{
    _id: string;
    count: number;
  }>;
  averageBudget: {
    avgMin: number;
    avgMax: number;
  };
}

export const taskService = {
  // Get all public tasks with filters and pagination
  async getTasks(
    page: number = 1,
    limit: number = 12,
    filters: TaskFilters = {},
  ): Promise<TasksResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(
          ([_, value]) => value !== undefined && value !== "",
        ),
      ),
    });

    const response = await api.get(`/tasks?${params}`);
    return response.data.data;
  },

  // Get single task by ID
  async getTask(taskId: string): Promise<Task> {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data.data;
  },

  // Track unique view for a task
  async trackView(
    taskId: string,
  ): Promise<{ views: number; isNewView: boolean }> {
    try {
      const response = await api.post(`/tasks/${taskId}/view`);
      return response.data.data;
    } catch (error) {
      console.error("Error tracking view:", error);
      // Return default values if tracking fails
      return { views: 0, isNewView: false };
    }
  },

  // Create new task (Company only)
  async createTask(taskData: CreateTaskData): Promise<Task> {
    const response = await api.post("/tasks", taskData);
    return response.data.data;
  },

  // Update task (Company owner only)
  async updateTask(
    taskId: string,
    taskData: Partial<CreateTaskData>,
  ): Promise<Task> {
    const response = await api.put(`/tasks/${taskId}`, taskData);
    return response.data.data;
  },

  // Delete task (Company owner only)
  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`);
  },

  // Get company's tasks (Company only)
  async getMyTasks(
    page: number = 1,
    limit: number = 10,
    status: string = "all",
    sortBy: string = "createdAt",
    sortOrder: "asc" | "desc" = "desc",
  ): Promise<TasksResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      status,
      sortBy,
      sortOrder,
    });

    const response = await api.get(`/tasks/company/my-tasks?${params}`);
    return response.data.data;
  },

  // Get task statistics
  async getTaskStats(): Promise<TaskStats> {
    const response = await api.get("/tasks/stats");
    return response.data.data;
  },

  // Search tasks with advanced filters
  async searchTasks(
    query: string,
    filters: Record<string, any> = {},
    page: number = 1,
    limit: number = 12,
    sortBy: string = "relevance",
  ): Promise<TasksResponse> {
    const response = await api.post("/tasks/search", {
      query,
      filters,
      page,
      limit,
      sortBy,
    });
    return response.data.data;
  },

  // Get recommended tasks (Student only)
  async getRecommendedTasks(limit: number = 10): Promise<Task[]> {
    const response = await api.get(`/tasks/recommendations?limit=${limit}`);
    return response.data.data;
  },

  // Get popular categories
  async getPopularCategories(): Promise<
    Array<{ name: string; count: number }>
  > {
    const stats = await this.getTaskStats();
    return stats.tasksByCategory.map((cat) => ({
      name: cat._id,
      count: cat.count,
    }));
  },

  // Format duration for display
  formatDuration(duration: { value: number; unit: string }): string {
    const { value, unit } = duration;
    if (value === 1) {
      return `1 ${unit.slice(0, -1)}`; // Remove 's' for singular
    }
    return `${value} ${unit}`;
  },

  // Format budget for display
  formatBudget(budget: Task["budget"]): string {
    if (budget.type === "unpaid") {
      return "Unpaid";
    }

    if (!budget.amount) {
      return "Negotiable";
    }

    const { min, max } = budget.amount;
    const currency = budget.currency || "USD";
    const symbol = currency === "USD" ? "$" : currency;

    if (budget.type === "fixed") {
      if (min === max) {
        return `${symbol}${min.toLocaleString()}`;
      }
      return `${symbol}${min.toLocaleString()} - ${symbol}${max.toLocaleString()}`;
    }

    if (budget.type === "hourly") {
      if (min === max) {
        return `${symbol}${min}/hr`;
      }
      return `${symbol}${min} - ${symbol}${max}/hr`;
    }

    return "Negotiable";
  },

  // Calculate time remaining
  getTimeRemaining(deadline: string): {
    days: number;
    hours: number;
    expired: boolean;
  } {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - now.getTime();

    if (diff <= 0) {
      return { days: 0, hours: 0, expired: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return { days, hours, expired: false };
  },

  // Get experience level color
  getExperienceLevelColor(level: string): string {
    switch (level) {
      case "entry":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "expert":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  },

  // Get work type icon
  getWorkTypeIcon(workType: string): string {
    switch (workType) {
      case "remote":
        return "🏠";
      case "onsite":
        return "🏢";
      case "hybrid":
        return "🔄";
      default:
        return "📍";
    }
  },

  // Get category icon
  getCategoryIcon(category: string): string {
    switch (category) {
      case "Web Development":
        return "💻";
      case "Mobile Development":
        return "📱";
      case "UI/UX Design":
        return "🎨";
      case "Data Science":
        return "📊";
      case "Machine Learning":
        return "🤖";
      case "Digital Marketing":
        return "📈";
      case "Content Writing":
        return "✍️";
      case "Graphic Design":
        return "🖼️";
      case "Video Editing":
        return "🎬";
      case "Business Analysis":
        return "📋";
      case "Quality Assurance":
        return "🔍";
      case "DevOps":
        return "⚙️";
      case "Cybersecurity":
        return "🔒";
      default:
        return "📁";
    }
  },
};
