import type { UserRole } from "@/types/auth.types";

/**
 * Where each role lands after login / verification, and where a user is sent
 * when they hit a page their role is not allowed to see.
 *
 * This used to be copy-pasted into useRoleProtection, UserDropdown and all five
 * (auth) pages. Keeping one copy is what stops a newly added role (mentor) from
 * silently landing on a 404.
 */
export const ROLE_HOME: Record<UserRole, string> = {
  student: "/student/dashboard",
  company: "/company/dashboard",
  mentor: "/mentor/students",
  admin: "/admin/mentors",
};

export const homeForRole = (role?: string | null): string =>
  (role && ROLE_HOME[role as UserRole]) || "/";

/** The four primary nav destinations per role, used by the Navbar. */
export interface RoleNav {
  dashboard: string;
  tasks: { href: string; label: string };
  work: { href: string; label: string };
  profile: string;
}

export const ROLE_NAV: Record<UserRole, RoleNav> = {
  student: {
    dashboard: "/student/dashboard",
    tasks: { href: "/tasks", label: "Tasks" },
    work: { href: "/student/interviews", label: "Interviews" },
    profile: "/student/profile",
  },
  company: {
    dashboard: "/company/dashboard",
    tasks: { href: "/company/tasks", label: "Tasks" },
    work: { href: "/company/interviews", label: "Interviews" },
    profile: "/company/profile",
  },
  mentor: {
    dashboard: "/mentor/students",
    tasks: { href: "/mentor/students", label: "Mentees" },
    work: { href: "/mentor/feedback", label: "Feedback" },
    profile: "/mentor/profile",
  },
  admin: {
    dashboard: "/admin/mentors",
    tasks: { href: "/admin/mentors", label: "Mentors" },
    work: { href: "/tasks", label: "Tasks" },
    profile: "/admin/mentors",
  },
};

export const navForRole = (role?: string | null): RoleNav =>
  ROLE_NAV[(role as UserRole) ?? "student"] ?? ROLE_NAV.student;
