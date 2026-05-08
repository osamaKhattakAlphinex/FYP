import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that everyone can access
  const publicPaths = [
    "/",
    "/login",
    "/register",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
    "/unauthorized",
  ];

  // Public profile routes (accessible to all)
  const isPublicProfile =
    pathname.startsWith("/profile/") ||
    (pathname.startsWith("/company/") && pathname.match(/^\/company\/[^\/]+$/));

  // Check if current path is in public paths
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path),
  );

  // Allow public routes and public profiles
  if (isPublicPath || isPublicProfile) {
    return NextResponse.next();
  }

  // For protected routes, authentication is handled on client side via useRoleProtection hook
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)"],
};
