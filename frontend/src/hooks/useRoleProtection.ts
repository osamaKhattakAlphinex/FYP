"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authService } from "@/services/authService";
import toast from "react-hot-toast";

type UserRole = "student" | "company" | "admin" | "mentor";

interface RoleProtectionOptions {
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export function useRoleProtection({
  allowedRoles,
  redirectTo,
}: RoleProtectionOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const hasChecked = useRef(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Prevent multiple checks in React strict mode
    if (hasChecked.current) {
      return;
    }

    hasChecked.current = true;

    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        toast.error("Please login to access this page");
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    // Get user role
    const user = authService.getStoredUser();

    if (!user) {
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        toast.error("Please login to access this page");
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    // Check if user role is allowed
    if (!allowedRoles.includes(user.role as UserRole)) {
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        toast.error("You do not have permission to access this page");

        // Redirect to appropriate dashboard or custom redirect
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          const roleRoutes: Record<string, string> = {
            student: "/student/dashboard",
            company: "/company/dashboard",
            mentor: "/mentor/students",
            admin: "/admin/analytics",
          };
          router.push(roleRoutes[user.role] || "/");
        }
      }
    }
  }, [allowedRoles, redirectTo, router, pathname]);
}
