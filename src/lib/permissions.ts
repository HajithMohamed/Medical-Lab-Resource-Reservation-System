import type { Role } from "@/generated/prisma/client";

export interface UserLike {
  role: Role | string;
  siteId?: string | null;
}

/**
 * Returns true if the user has the ADMIN role.
 */
export function isAdmin(user: UserLike): boolean {
  return user.role === "ADMIN";
}

/**
 * Returns true if the user has MANAGER or ADMIN role.
 */
export function isManagerOrAdmin(user: UserLike): boolean {
  return user.role === "MANAGER" || user.role === "ADMIN";
}

/**
 * Returns true if the user can manage resources/users/maintenance for the given site.
 * - ADMIN: can manage any site.
 * - MANAGER: can only manage their own site.
 * - STAFF: cannot manage sites.
 */
export function canManageSite(user: UserLike, siteId?: string | null): boolean {
  if (user.role === "ADMIN") {
    return true;
  }
  if (user.role === "MANAGER") {
    return Boolean(user.siteId && siteId && user.siteId === siteId);
  }
  return false;
}
