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

/**
 * Returns the list of roles the actor is permitted to create:
 * - ADMIN -> ["STAFF", "MANAGER", "ADMIN"]
 * - MANAGER -> ["STAFF"]
 * - STAFF -> []
 */
export function rolesActorCanCreate(actor: UserLike): Role[] {
  if (actor.role === "ADMIN") {
    return ["STAFF", "MANAGER", "ADMIN"];
  }
  if (actor.role === "MANAGER") {
    return ["STAFF"];
  }
  return [];
}

/**
 * Returns true if the actor is permitted to manage the target user:
 * - ADMIN -> true
 * - MANAGER -> target.role is STAFF and target.siteId === actor.siteId
 * - STAFF -> false
 */
export function canManageUser(actor: UserLike, target: UserLike): boolean {
  if (actor.role === "ADMIN") {
    return true;
  }
  if (actor.role === "MANAGER") {
    return (
      target.role === "STAFF" &&
      Boolean(actor.siteId && target.siteId && actor.siteId === target.siteId)
    );
  }
  return false;
}
