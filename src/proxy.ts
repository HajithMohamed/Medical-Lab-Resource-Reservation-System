import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/config/rules";
import { verifySessionToken } from "@/lib/session";

/**
 * Optimistic proxy check for Next.js 16.4.
 * Performs fast token verification with NO database access.
 * The real checks are requireUser() and requireRole() in every page and action.
 */
export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  // No valid token and not on /login -> redirect to /login.
  // We do NOT redirect away from /login in proxy: a token could be cryptographically valid
  // but stale (user deactivated, password changed, or db reset). Redirecting to /calendar
  // would cause an infinite redirect loop with requireUser().
  if (!session && path !== "/login") {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/health|_next/static|_next/image|favicon\\.ico|icon|apple-icon|.*\\..*).*)"],
};
