import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/config/rules";
import { verifySessionToken } from "@/lib/session";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  siteId: string | null;
  siteName: string | null;
  sectionId: string | null;
  mustChangePassword: boolean;
}

/**
 * Data Access Layer: loads the authenticated user for the current session.
 * Cached per request using React cache().
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = await verifySessionToken(token);
  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      siteId: true,
      sectionId: true,
      isActive: true,
      mustChangePassword: true,
      sessionVersion: true,
      site: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!user || !user.isActive || user.sessionVersion !== payload.sessionVersion) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    siteId: user.siteId,
    siteName: user.site?.name ?? null,
    sectionId: user.sectionId,
    mustChangePassword: user.mustChangePassword,
  };
});

/**
 * Requires an authenticated user.
 * Redirects to /login if unauthenticated, or to /change-password if mustChangePassword is true.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.mustChangePassword) {
    redirect("/change-password");
  }
  return user;
}

/**
 * Requires an authenticated user with one of the specified roles.
 * Redirects to /no-access if the user's role is not allowed.
 */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/no-access");
  }
  return user;
}
