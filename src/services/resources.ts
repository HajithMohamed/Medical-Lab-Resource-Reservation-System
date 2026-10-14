import "server-only";

import { z } from "zod";
import { db } from "@/lib/db";
import { canManageSite, type UserLike } from "@/lib/permissions";
import { isUniqueError } from "@/lib/db-errors";
import { ResourceStatus, ReservationKind, ReservationStatus } from "@/generated/prisma/client";

export type ServiceResult<T = void> =
  | { ok: true; data: T; message?: string; totalCount?: number; totalPages?: number }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export interface ResourceFilterOptions {
  siteId?: string;
  categoryId?: string;
  sectionId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ResourceListItem {
  id: string;
  name: string;
  categoryId: string;
  siteId: string;
  sectionId: string;
  location: string | null;
  capacity: number | null;
  status: ResourceStatus;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
    maxBookingMinutes: number;
    iconKey: string;
  };
  site: {
    id: string;
    name: string;
  };
  section: {
    id: string;
    name: string;
  };
}

export interface ResourceDetailItem extends ResourceListItem {
  reservationsNext7Days: Array<{
    id: string;
    kind: ReservationKind;
    status: ReservationStatus;
    purpose: string;
    attendeeCount: number | null;
    startAt: Date;
    endAt: Date;
    createdBy: {
      id: string;
      name: string;
      email: string;
      site?: { name: string } | null;
    };
  }>;
  recentMaintenance: Array<{
    id: string;
    purpose: string;
    startAt: Date;
    endAt: Date;
    status: ReservationStatus;
    cancelReason: string | null;
    createdBy: {
      id: string;
      name: string;
    };
  }>;
}

export const resourceInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name cannot exceed 80 characters."),
  siteId: z.string().trim().uuid("Select a valid site."),
  categoryId: z.string().trim().uuid("Select a valid category."),
  sectionId: z.string().trim().uuid("Select a valid section."),
  location: z
    .string()
    .trim()
    .max(120, "Location cannot exceed 120 characters.")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  capacity: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z
        .number()
        .int("Capacity must be a whole number.")
        .min(1, "Capacity must be between 1 and 500.")
        .max(500, "Capacity must be between 1 and 500.")
        .nullable()
        .optional(),
    )
    .optional()
    .nullable(),
});

export type ResourceInput = z.infer<typeof resourceInputSchema>;

/**
 * Lists resources with optional filters. Everyone may view every site.
 * Default status filter includes ACTIVE and OUT_OF_SERVICE.
 * Ordered by site, category, and name.
 */
export async function listResources(
  filters: ResourceFilterOptions = {},
): Promise<ServiceResult<ResourceListItem[]>> {
  const where: Record<string, unknown> = {};

  if (filters.siteId && filters.siteId.trim() !== "") {
    where.siteId = filters.siteId.trim();
  }

  if (filters.categoryId && filters.categoryId.trim() !== "") {
    where.categoryId = filters.categoryId.trim();
  }

  if (filters.sectionId && filters.sectionId.trim() !== "") {
    where.sectionId = filters.sectionId.trim();
  }

  if (filters.search && filters.search.trim() !== "") {
    where.name = {
      contains: filters.search.trim(),
      mode: "insensitive",
    };
  }

  // Status filter logic: default is ACTIVE and OUT_OF_SERVICE (RETIRED only when explicitly chosen)
  const statusParam = filters.status?.trim().toUpperCase();
  if (statusParam === "RETIRED") {
    where.status = ResourceStatus.RETIRED;
  } else if (statusParam === "ACTIVE") {
    where.status = ResourceStatus.ACTIVE;
  } else if (statusParam === "OUT_OF_SERVICE") {
    where.status = ResourceStatus.OUT_OF_SERVICE;
  } else if (statusParam === "ALL") {
    // Show all including retired
  } else {
    // Default: ACTIVE and OUT_OF_SERVICE
    where.status = {
      in: [ResourceStatus.ACTIVE, ResourceStatus.OUT_OF_SERVICE],
    };
  }

  const shouldPaginate = filters.page !== undefined || filters.pageSize !== undefined;
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, filters.pageSize ?? 10);

  const totalCount = await db.resource.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const resources = await db.resource.findMany({
    where,
    skip: shouldPaginate ? (page - 1) * pageSize : undefined,
    take: shouldPaginate ? pageSize : undefined,
    include: {
      category: {
        select: {
          id: true,
          name: true,
          maxBookingMinutes: true,
          iconKey: true,
        },
      },
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
    orderBy: [{ site: { name: "asc" } }, { category: { name: "asc" } }, { name: "asc" }],
  });

  return { ok: true, data: resources, totalCount, totalPages };
}

/**
 * Loads a resource by ID along with:
 * - its category (and booking limit), site, and section
 * - its CONFIRMED reservations in the next 7 days (with booking user)
 * - its last 5 maintenance blocks
 */
export async function getResource(id: string): Promise<ServiceResult<ResourceDetailItem | null>> {
  const resource = await db.resource.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          maxBookingMinutes: true,
          iconKey: true,
        },
      },
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

  if (!resource) {
    return { ok: false, error: "Resource not found." };
  }

  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Confirmed reservations in the next 7 days
  const reservationsNext7Days = await db.reservation.findMany({
    where: {
      resourceId: id,
      status: ReservationStatus.CONFIRMED,
      startAt: { lt: next7Days },
      endAt: { gt: now },
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      kind: true,
      status: true,
      purpose: true,
      attendeeCount: true,
      startAt: true,
      endAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          site: {
            select: { name: true },
          },
        },
      },
    },
  });

  // Last 5 maintenance blocks (regardless of current status)
  const recentMaintenance = await db.reservation.findMany({
    where: {
      resourceId: id,
      kind: ReservationKind.MAINTENANCE,
    },
    orderBy: { startAt: "desc" },
    take: 5,
    select: {
      id: true,
      purpose: true,
      startAt: true,
      endAt: true,
      status: true,
      cancelReason: true,
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return {
    ok: true,
    data: {
      ...resource,
      reservationsNext7Days,
      recentMaintenance,
    },
  };
}

/**
 * Creates a new resource. Enforces canManageSite for the target site.
 * Name must be unique within the site.
 */
export async function createResource(
  actor: UserLike,
  rawInput: unknown,
): Promise<ServiceResult<ResourceListItem>> {
  const parsed = resourceInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid resource data.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, siteId, categoryId, sectionId, location, capacity } = parsed.data;

  if (!canManageSite(actor, siteId)) {
    return {
      ok: false,
      error: "You do not have permission to add resources for this site.",
    };
  }

  // Validate site existence
  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { id: true, name: true },
  });
  if (!site) {
    return { ok: false, error: "The selected site does not exist." };
  }

  // Validate category existence
  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) {
    return { ok: false, error: "The selected category does not exist." };
  }

  // Validate section existence
  const section = await db.section.findUnique({
    where: { id: sectionId },
    select: { id: true },
  });
  if (!section) {
    return { ok: false, error: "The selected section does not exist." };
  }

  // Check unique per site: "<site> already has a resource called <name>."
  const existingSameName = await db.resource.findUnique({
    where: {
      siteId_name: {
        siteId,
        name,
      },
    },
    select: { id: true },
  });
  if (existingSameName) {
    const errorMsg = `${site.name} already has a resource called ${name}.`;
    return {
      ok: false,
      error: errorMsg,
      fieldErrors: { name: [errorMsg] },
    };
  }

  try {
    const created = await db.resource.create({
      data: {
        name,
        siteId,
        categoryId,
        sectionId,
        location,
        capacity,
        status: ResourceStatus.ACTIVE,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            maxBookingMinutes: true,
            iconKey: true,
          },
        },
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

    return {
      ok: true,
      data: created,
      message: "Resource added",
    };
  } catch (error) {
    if (isUniqueError(error)) {
      const errorMsg = `${site.name} already has a resource called ${name}.`;
      return {
        ok: false,
        error: errorMsg,
        fieldErrors: { name: [errorMsg] },
      };
    }
    throw error;
  }
}

/**
 * Updates an existing resource.
 * Loads the stored resource first and checks canManageSite for its stored site.
 * If input.siteId is different, also checks canManageSite for the new site.
 * Status is NOT changed here.
 */
export async function updateResource(
  actor: UserLike,
  id: string,
  rawInput: unknown,
): Promise<ServiceResult<ResourceListItem>> {
  const stored = await db.resource.findUnique({
    where: { id },
    include: {
      site: { select: { id: true, name: true } },
    },
  });

  if (!stored) {
    return { ok: false, error: "Resource not found." };
  }

  // Check stored site permission
  if (!canManageSite(actor, stored.siteId)) {
    return {
      ok: false,
      error: "You do not have permission to manage this resource.",
    };
  }

  const parsed = resourceInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid resource data.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, siteId, categoryId, sectionId, location, capacity } = parsed.data;

  // If site is changing, check canManageSite for new site
  if (siteId !== stored.siteId && !canManageSite(actor, siteId)) {
    return {
      ok: false,
      error: "You do not have permission to move resources to that site.",
    };
  }

  const targetSite =
    siteId === stored.siteId
      ? stored.site
      : await db.site.findUnique({
          where: { id: siteId },
          select: { id: true, name: true },
        });

  if (!targetSite) {
    return { ok: false, error: "The selected site does not exist." };
  }

  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) {
    return { ok: false, error: "The selected category does not exist." };
  }

  const section = await db.section.findUnique({
    where: { id: sectionId },
    select: { id: true },
  });
  if (!section) {
    return { ok: false, error: "The selected section does not exist." };
  }

  // Check unique per site if name or site changed
  if (name !== stored.name || siteId !== stored.siteId) {
    const existing = await db.resource.findUnique({
      where: {
        siteId_name: {
          siteId,
          name,
        },
      },
      select: { id: true },
    });
    if (existing && existing.id !== id) {
      const errorMsg = `${targetSite.name} already has a resource called ${name}.`;
      return {
        ok: false,
        error: errorMsg,
        fieldErrors: { name: [errorMsg] },
      };
    }
  }

  try {
    const updated = await db.resource.update({
      where: { id },
      data: {
        name,
        siteId,
        categoryId,
        sectionId,
        location,
        capacity,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            maxBookingMinutes: true,
            iconKey: true,
          },
        },
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

    return {
      ok: true,
      data: updated,
      message: "Changes saved",
    };
  } catch (error) {
    if (isUniqueError(error)) {
      const errorMsg = `${targetSite.name} already has a resource called ${name}.`;
      return {
        ok: false,
        error: errorMsg,
        fieldErrors: { name: [errorMsg] },
      };
    }
    throw error;
  }
}

/**
 * Counts CONFIRMED BOOKINGs for a resource that have not started yet.
 */
export async function countUpcomingBookings(resourceId: string): Promise<number> {
  const now = new Date();
  return db.reservation.count({
    where: {
      resourceId,
      kind: ReservationKind.BOOKING,
      status: ReservationStatus.CONFIRMED,
      startAt: { gt: now },
    },
  });
}

/**
 * Changes a resource's status (ACTIVE, OUT_OF_SERVICE, RETIRED).
 * - Enforces canManageSite for the stored site.
 * - Requires a reason of 3-200 chars for OUT_OF_SERVICE or RETIRED.
 * - In ONE transaction: updates status and cancels all future CONFIRMED bookings
 *   with recorded cancelReason ("Resource out of service: <reason>" or "Resource retired: <reason>").
 *   Maintenance blocks are preserved.
 * - Going back to ACTIVE cancels nothing.
 * Returns the count of cancelled bookings.
 */
export async function changeStatus(
  actor: UserLike & { id: string },
  id: string,
  newStatus: ResourceStatus,
  reason?: string,
): Promise<ServiceResult<{ status: ResourceStatus; cancelledBookingsCount: number }>> {
  const stored = await db.resource.findUnique({
    where: { id },
    select: {
      id: true,
      siteId: true,
      status: true,
    },
  });

  if (!stored) {
    return { ok: false, error: "Resource not found." };
  }

  if (!canManageSite(actor, stored.siteId)) {
    return {
      ok: false,
      error: "You do not have permission to manage this resource.",
    };
  }

  const validStatuses: ResourceStatus[] = [
    ResourceStatus.ACTIVE,
    ResourceStatus.OUT_OF_SERVICE,
    ResourceStatus.RETIRED,
  ];
  if (!validStatuses.includes(newStatus)) {
    return { ok: false, error: "Invalid status." };
  }

  const trimmedReason = reason?.trim();
  if (newStatus === ResourceStatus.OUT_OF_SERVICE || newStatus === ResourceStatus.RETIRED) {
    if (!trimmedReason || trimmedReason.length < 3 || trimmedReason.length > 200) {
      return {
        ok: false,
        error: "A reason between 3 and 200 characters is required.",
      };
    }
  }

  const now = new Date();
  let cancelledCount = 0;

  if (newStatus === ResourceStatus.OUT_OF_SERVICE || newStatus === ResourceStatus.RETIRED) {
    const cancelReason =
      newStatus === ResourceStatus.OUT_OF_SERVICE
        ? `Resource out of service: ${trimmedReason}`
        : `Resource retired: ${trimmedReason}`;

    await db.$transaction(async (tx) => {
      const updateResult = await tx.reservation.updateMany({
        where: {
          resourceId: id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          startAt: { gt: now },
        },
        data: {
          status: ReservationStatus.CANCELLED,
          cancelReason,
          cancelledAt: now,
          cancelledById: actor.id,
        },
      });

      cancelledCount = updateResult.count;

      await tx.resource.update({
        where: { id },
        data: { status: newStatus },
      });
    });
  } else {
    // Back to ACTIVE: only status changes
    await db.resource.update({
      where: { id },
      data: { status: ResourceStatus.ACTIVE },
    });
  }

  let message = "Changes saved";
  if (newStatus === ResourceStatus.ACTIVE) {
    message = "Marked active";
  } else if (newStatus === ResourceStatus.OUT_OF_SERVICE) {
    message = "Marked out of service";
  } else if (newStatus === ResourceStatus.RETIRED) {
    message = "Resource retired";
  }

  return {
    ok: true,
    data: {
      status: newStatus,
      cancelledBookingsCount: cancelledCount,
    },
    message,
  };
}
