import "server-only";

import { z } from "zod";
import { db } from "@/lib/db";
import { type UserLike, rolesActorCanCreate, canManageUser } from "@/lib/permissions";
import { isUniqueError } from "@/lib/db-errors";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";
import { Role } from "@/generated/prisma/client";

export type ServiceResult<T = void> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export interface UserFilterOptions {
  siteId?: string;
  role?: Role;
  status?: "ACTIVE" | "LOCKED" | "MUST_CHANGE_PASSWORD" | "INACTIVE";
}

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  siteId: string | null;
  sectionId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  site: {
    id: string;
    name: string;
  } | null;
  section: {
    id: string;
    name: string;
  } | null;
}

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name cannot exceed 80 characters."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.nativeEnum(Role, {
    message: "Select a valid role.",
  }),
  siteId: z
    .string()
    .trim()
    .uuid("Select a valid site.")
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  sectionId: z
    .string()
    .trim()
    .uuid("Select a valid section.")
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name cannot exceed 80 characters.")
    .optional(),
  sectionId: z
    .string()
    .trim()
    .uuid("Select a valid section.")
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  role: z.nativeEnum(Role).optional(),
  siteId: z
    .string()
    .trim()
    .uuid("Select a valid site.")
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/**
 * Lists users according to the actor's permissions.
 * - Site managers only see STAFF of their own site.
 * - Admins see all users and can apply filters.
 */
export async function listUsers(
  actor: UserLike,
  filters: UserFilterOptions = {},
): Promise<ServiceResult<UserListItem[]>> {
  const now = new Date();
  const where: Record<string, unknown> = {};

  if (actor.role === "MANAGER") {
    if (!actor.siteId) {
      return { ok: false, error: "Manager has no assigned site." };
    }
    // Managers strictly see STAFF at their own site
    where.siteId = actor.siteId;
    where.role = "STAFF";
  } else if (actor.role === "ADMIN") {
    if (filters.siteId) {
      where.siteId = filters.siteId;
    }
    if (filters.role) {
      where.role = filters.role;
    }
  } else {
    return { ok: false, error: "You do not have permission to view users." };
  }

  // Status filter
  if (filters.status) {
    switch (filters.status) {
      case "INACTIVE":
        where.isActive = false;
        break;
      case "LOCKED":
        where.isActive = true;
        where.lockedUntil = { gt: now };
        break;
      case "MUST_CHANGE_PASSWORD":
        where.isActive = true;
        where.mustChangePassword = true;
        where.OR = [{ lockedUntil: null }, { lockedUntil: { lte: now } }];
        break;
      case "ACTIVE":
        where.isActive = true;
        where.mustChangePassword = false;
        where.OR = [{ lockedUntil: null }, { lockedUntil: { lte: now } }];
        break;
    }
  }

  const users = await db.user.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      siteId: true,
      sectionId: true,
      isActive: true,
      mustChangePassword: true,
      lockedUntil: true,
      lastLoginAt: true,
      createdAt: true,
      site: {
        select: {
          id: true,
          name: true,
        },
      },
      section: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return { ok: true, data: users };
}

/**
 * Loads a user for viewing or editing.
 * Returns null if user is not found OR actor does not have permission to manage this user,
 * ensuring IDs from other sites reveal no information.
 */
export async function getUser(
  actor: UserLike,
  id: string,
): Promise<ServiceResult<UserListItem | null>> {
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      siteId: true,
      sectionId: true,
      isActive: true,
      mustChangePassword: true,
      lockedUntil: true,
      lastLoginAt: true,
      createdAt: true,
      site: {
        select: {
          id: true,
          name: true,
        },
      },
      section: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!user) {
    return { ok: false, error: "User not found." };
  }

  if (!canManageUser(actor, user)) {
    return { ok: false, error: "User not found." };
  }

  return { ok: true, data: user };
}

/**
 * Counts upcoming confirmed bookings for a user.
 */
export async function getUpcomingBookingsCount(
  actor: UserLike,
  id: string,
): Promise<ServiceResult<number>> {
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, role: true, siteId: true },
  });

  if (!user || !canManageUser(actor, user)) {
    return { ok: false, error: "User not found." };
  }

  const count = await db.reservation.count({
    where: {
      createdById: id,
      kind: "BOOKING",
      status: "CONFIRMED",
      startAt: { gt: new Date() },
    },
  });

  return { ok: true, data: count };
}

/**
 * Returns a map of upcoming confirmed booking counts for an array of user IDs.
 */
export async function getUpcomingBookingsCountMap(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const counts = await db.reservation.groupBy({
    by: ["createdById"],
    where: {
      createdById: { in: userIds },
      kind: "BOOKING",
      status: "CONFIRMED",
      startAt: { gt: new Date() },
    },
    _count: {
      _all: true,
    },
  });

  const map = new Map<string, number>();
  for (const c of counts) {
    map.set(c.createdById, c._count._all);
  }
  return map;
}

/**
 * Creates a new user with a generated NIST-compliant temporary password.
 * Returns only the user ID, name, and temporary password.
 */
export async function createUser(
  actor: UserLike,
  rawInput: unknown,
): Promise<
  ServiceResult<{
    userId: string;
    name: string;
    temporaryPassword: string;
  }>
> {
  const parsed = createUserSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid user data.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const allowedRoles = rolesActorCanCreate(actor);
  if (!allowedRoles.includes(parsed.data.role)) {
    return {
      ok: false,
      error: "You do not have permission to create this role.",
    };
  }

  let finalSiteId: string | null = parsed.data.siteId ?? null;

  if (actor.role === "MANAGER") {
    // A manager's new user always gets the manager's site
    finalSiteId = actor.siteId ?? null;
  } else if (actor.role === "ADMIN") {
    if (parsed.data.role === "ADMIN") {
      finalSiteId = null;
    } else if (!finalSiteId) {
      return {
        ok: false,
        error: "A site is required for staff and managers.",
        fieldErrors: { siteId: ["A site is required for staff and managers."] },
      };
    }
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();

  const existing = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      error: "An account with this email already exists.",
      fieldErrors: { email: ["An account with this email already exists."] },
    };
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  try {
    const user = await db.user.create({
      data: {
        name: parsed.data.name,
        email: normalizedEmail,
        role: parsed.data.role,
        siteId: finalSiteId,
        sectionId: parsed.data.sectionId ?? null,
        passwordHash,
        mustChangePassword: true,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    return {
      ok: true,
      data: {
        userId: user.id,
        name: user.name,
        temporaryPassword,
      },
      message: "User created",
    };
  } catch (error) {
    if (isUniqueError(error)) {
      return {
        ok: false,
        error: "An account with this email already exists.",
        fieldErrors: { email: ["An account with this email already exists."] },
      };
    }
    throw error;
  }
}

/**
 * Updates a user's details.
 */
export async function updateUser(
  actor: UserLike & { id: string },
  id: string,
  rawInput: unknown,
): Promise<ServiceResult> {
  const targetUser = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      role: true,
      siteId: true,
      isActive: true,
    },
  });

  if (!targetUser || !canManageUser(actor, targetUser)) {
    return { ok: false, error: "User not found." };
  }

  const parsed = updateUserSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid user data.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Only admins may change role or site
  const wantsRoleChange = parsed.data.role && parsed.data.role !== targetUser.role;
  const wantsSiteChange =
    parsed.data.siteId !== undefined && parsed.data.siteId !== targetUser.siteId;

  if ((wantsRoleChange || wantsSiteChange) && actor.role !== "ADMIN") {
    return { ok: false, error: "Only admins can change user roles or sites." };
  }

  // Nobody changes their own role
  if (actor.id === id && wantsRoleChange) {
    return { ok: false, error: "You cannot change your own role." };
  }

  // The last active ADMIN cannot be demoted
  if (targetUser.role === "ADMIN" && wantsRoleChange && parsed.data.role !== "ADMIN") {
    const activeAdmins = await db.user.count({
      where: { role: "ADMIN", isActive: true },
    });
    if (activeAdmins <= 1) {
      return {
        ok: false,
        error: "The last active administrator cannot be demoted.",
      };
    }
  }

  const newRole = parsed.data.role ?? targetUser.role;
  let newSiteId = parsed.data.siteId !== undefined ? parsed.data.siteId : targetUser.siteId;

  if (newRole === "ADMIN") {
    newSiteId = null;
  } else if (!newSiteId) {
    const errorMsg =
      targetUser.role === "ADMIN"
        ? "A site must be assigned when changing an administrator to a staff member or manager."
        : "A site is required for staff and managers.";
    return {
      ok: false,
      error: errorMsg,
      fieldErrors: { siteId: [errorMsg] },
    };
  }

  await db.user.update({
    where: { id },
    data: {
      name: parsed.data.name ?? targetUser.name,
      sectionId: parsed.data.sectionId !== undefined ? parsed.data.sectionId : undefined,
      role: newRole,
      siteId: newSiteId,
    },
  });

  return { ok: true, data: undefined, message: "User updated" };
}

/**
 * Resets a user's password, generating a new temporary password,
 * setting mustChangePassword to true, clearing lockouts, and invalidating existing sessions.
 */
export async function resetPassword(
  actor: UserLike,
  id: string,
): Promise<ServiceResult<{ temporaryPassword: string }>> {
  const targetUser = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      siteId: true,
    },
  });

  if (!targetUser || !canManageUser(actor, targetUser)) {
    return { ok: false, error: "User not found." };
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  await db.user.update({
    where: { id },
    data: {
      passwordHash,
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
      sessionVersion: { increment: 1 },
    },
  });

  return {
    ok: true,
    data: { temporaryPassword },
    message: "Password reset",
  };
}

/**
 * Deactivates or reactivates a user account.
 * - Nobody deactivates themselves.
 * - The last active admin cannot be deactivated.
 * - Deactivating cancels upcoming CONFIRMED bookings in one transaction.
 */
export async function setActive(
  actor: UserLike & { id: string },
  id: string,
  isActive: boolean,
): Promise<ServiceResult<{ cancelledBookingsCount: number }>> {
  const targetUser = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      siteId: true,
      isActive: true,
    },
  });

  if (!targetUser || !canManageUser(actor, targetUser)) {
    return { ok: false, error: "User not found." };
  }

  // Nobody deactivates themselves
  if (actor.id === id && !isActive) {
    return { ok: false, error: "You cannot deactivate your own account." };
  }

  // The last active ADMIN cannot be deactivated
  if (targetUser.role === "ADMIN" && !isActive) {
    const activeAdmins = await db.user.count({
      where: { role: "ADMIN", isActive: true },
    });
    if (activeAdmins <= 1) {
      return {
        ok: false,
        error: "The last active administrator cannot be deactivated.",
      };
    }
  }

  if (!isActive) {
    // Run in one transaction: deactivate user, bump sessionVersion, cancel upcoming bookings
    const now = new Date();
    const cancelledCount = await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          isActive: false,
          sessionVersion: { increment: 1 },
        },
      });

      // Find upcoming CONFIRMED BOOKING reservations (not maintenance blocks)
      const upcomingBookings = await tx.reservation.findMany({
        where: {
          createdById: id,
          kind: "BOOKING",
          status: "CONFIRMED",
          startAt: { gt: now },
        },
        select: { id: true },
      });

      if (upcomingBookings.length > 0) {
        await tx.reservation.updateMany({
          where: {
            id: { in: upcomingBookings.map((b) => b.id) },
          },
          data: {
            status: "CANCELLED",
            cancelReason: "Booking cancelled because the account was deactivated",
            cancelledAt: now,
            cancelledById: actor.id,
          },
        });
      }

      return upcomingBookings.length;
    });

    return {
      ok: true,
      data: { cancelledBookingsCount: cancelledCount },
      message: "Account deactivated",
    };
  }

  // Reactivating simply sets isActive true
  await db.user.update({
    where: { id },
    data: {
      isActive: true,
    },
  });

  return {
    ok: true,
    data: { cancelledBookingsCount: 0 },
    message: "Account reactivated",
  };
}
