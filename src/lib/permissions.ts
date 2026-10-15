import type { Role } from "@/generated/prisma/client";

export interface UserLike {
  id?: string;
  role: Role | string;
  siteId?: string | null;
}

export interface ResourceLike {
  id?: string;
  siteId: string;
  status?: string;
}

export interface BookingLike {
  id?: string;
  createdById?: string | null;
  userId?: string | null;
  kind: string;
  status?: string;
  startAt?: Date;
  resource: {
    siteId: string;
  };
}

/**
 * Returns true if the user has the ADMIN role.
 * Rule: Admin manages network infrastructure and settings; does not book.
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
 * Rule: STAFF and MANAGER can book resources for themselves.
 * ADMIN cannot book ([ADMIN-NO-BOOK]).
 */
export function canBook(actor: UserLike): boolean {
  return actor.role === "STAFF" || actor.role === "MANAGER";
}

/**
 * Rule: Only ADMIN can configure sites, sections, categories, and booking limits.
 */
export function canManageSettings(actor: UserLike): boolean {
  return isAdmin(actor);
}

/**
 * Rule: MANAGER (own site) and ADMIN (all sites) can view users.
 */
export function canViewUsers(actor: UserLike): boolean {
  return isManagerOrAdmin(actor);
}

/**
 * Rule: ADMIN can view any user; MANAGER can view users at their own site.
 * Constraint C3: Manager viewing another site's user returns not found.
 */
export function canViewUser(actor: UserLike, target: UserLike): boolean {
  if (isAdmin(actor)) {
    return true;
  }
  if (actor.role === "MANAGER") {
    return Boolean(actor.siteId && target.siteId && actor.siteId === target.siteId);
  }
  return false;
}

/**
 * Rule: Only ADMIN can change user roles or transfer sites, but never for themselves (C4).
 */
export function canChangeRoleOrSite(actor: UserLike, target: UserLike): boolean {
  if (!isAdmin(actor)) {
    return false;
  }
  return Boolean(actor.id && target.id && actor.id !== target.id);
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
 * Rule: MANAGER can manage resources at their own site; ADMIN can manage any resource.
 * Constraint C2: Uses the stored siteId of the resource.
 */
export function canManageResource(actor: UserLike, resource: ResourceLike): boolean {
  return canManageSite(actor, resource.siteId);
}

/**
 * Rule: Change resource status (out of service, back to active, retire).
 * Constraint C6: RETIRED is final: its status cannot change again.
 */
export function canChangeResourceStatus(actor: UserLike, resource: ResourceLike): boolean {
  if (!canManageResource(actor, resource)) {
    return false;
  }
  return resource.status !== "RETIRED";
}

/**
 * Rule: Cancel a booking.
 * - Own BOOKING: allowed if actor can book and created the booking.
 * - MANAGER: allowed for bookings on resources at their own site.
 * - ADMIN: allowed for all bookings.
 * - Never allowed for MAINTENANCE blocks (use canManageMaintenance).
 * Note: "Not started" (startAt > now) is enforced by the service layer.
 */
export function canCancelBooking(actor: UserLike, booking: BookingLike): boolean {
  if (booking.kind !== "BOOKING") {
    return false;
  }
  const creatorId = booking.createdById ?? booking.userId;
  if (canBook(actor) && actor.id && creatorId && actor.id === creatorId) {
    return true;
  }
  if (actor.role === "MANAGER" && actor.siteId && actor.siteId === booking.resource.siteId) {
    return true;
  }
  if (isAdmin(actor)) {
    return true;
  }
  return false;
}

/**
 * Rule: Creating or cancelling maintenance blocks on resources.
 * MANAGER for own site resources, ADMIN for all resources.
 */
export function canManageMaintenance(actor: UserLike, resource: ResourceLike): boolean {
  return canManageSite(actor, resource.siteId);
}

/**
 * Rule: MANAGER and ADMIN can oversee bookings across their sites.
 */
export function canOverseeBookings(actor: UserLike): boolean {
  return isManagerOrAdmin(actor);
}

/**
 * Rule: Returns "all" for ADMIN or [own siteId] for MANAGER.
 */
export function bookingOversightSitesFor(actor: UserLike): "all" | string[] {
  if (isAdmin(actor)) {
    return "all";
  }
  if (actor.role === "MANAGER" && actor.siteId) {
    return [actor.siteId];
  }
  return [];
}

/**
 * Rule: View usage statistics.
 * null / undefined / "all" = network overview (ADMIN only).
 * specific siteId: ADMIN for any site, MANAGER for own site.
 */
export function canViewUsage(actor: UserLike, siteId?: string | null): boolean {
  if (!siteId || siteId === "all") {
    return isAdmin(actor);
  }
  return canManageSite(actor, siteId);
}

/**
 * Rule: Returns "all" for ADMIN or [own siteId] for MANAGER for usage reports.
 */
export function usageSitesFor(actor: UserLike): "all" | string[] {
  if (isAdmin(actor)) {
    return "all";
  }
  if (actor.role === "MANAGER" && actor.siteId) {
    return [actor.siteId];
  }
  return [];
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
 * - ADMIN -> true (except self for role/site changes, checked separately)
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

/**
 * Backward compatibility alias for reservation cancellation checks.
 */
export function canCancelReservation(
  actor: UserLike,
  reservation: BookingLike & { status?: string; startAt?: Date },
  now: Date = new Date(),
): boolean {
  if (reservation.status && reservation.status !== "CONFIRMED") {
    return false;
  }
  if (reservation.startAt && reservation.startAt.getTime() <= now.getTime()) {
    return false;
  }
  return canCancelBooking(actor, reservation);
}

/**
 * Rule: MANAGER (own site) and ADMIN (all sites) can enter equipment details, schedules and add records.
 */
export function canManageEquipment(actor: UserLike, resource: ResourceLike): boolean {
  return canManageResource(actor, resource);
}

/**
 * Rule: MANAGER and ADMIN can view the Equipment care page and overview.
 */
export function canViewEquipmentOverview(actor: UserLike): boolean {
  return isManagerOrAdmin(actor);
}

/**
 * Rule: MANAGER (own site) and ADMIN (all sites) can view equipment reports and exports.
 */
export function canViewEquipmentReports(actor: UserLike): boolean {
  return isManagerOrAdmin(actor);
}

/**
 * Returns allowed site IDs for equipment care overview:
 * - ADMIN -> "all"
 * - MANAGER -> [own site]
 * - STAFF -> []
 */
export function equipmentOverviewSitesFor(actor: UserLike): "all" | string[] {
  if (isAdmin(actor)) {
    return "all";
  }
  if (actor.role === "MANAGER" && actor.siteId) {
    return [actor.siteId];
  }
  return [];
}

export interface CalendarOptions {
  canBookHere: boolean;
  canBlockHere: boolean;
}

/**
 * Returns role-based permissions for the calendar view at a specific site:
 * - STAFF: canBookHere = true, canBlockHere = false
 * - MANAGER on own site: canBookHere = true, canBlockHere = true
 * - MANAGER on another site: canBookHere = true, canBlockHere = false
 * - ADMIN: canBookHere = false, canBlockHere = true
 */
export function calendarOptionsFor(user: UserLike, siteId: string): CalendarOptions {
  return {
    canBookHere: canBook(user),
    canBlockHere: canManageMaintenance(user, { siteId }),
  };
}

/**
 * Rule: All signed-in roles (STAFF, MANAGER, ADMIN) can view notifications and preferences.
 */
export function canViewNotifications(actor: UserLike): boolean {
  return actor.role === "STAFF" || actor.role === "MANAGER" || actor.role === "ADMIN";
}

/**
 * Rule: STAFF and MANAGER can create resource watches ("Notify me when it's free" / "back in service").
 * ADMIN cannot watch resources because ADMIN does not book ([ADMIN-NO-BOOK]).
 */
export function canWatchResource(actor: UserLike): boolean {
  return canBook(actor);
}
