import "server-only";

import { subDays } from "date-fns";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { canManageMaintenance, bookingOversightSitesFor, type UserLike } from "@/lib/permissions";
import { isOverlapError } from "@/lib/db-errors";
import {
  isOnSlotBoundary,
  startOfCurrentSlot,
  ceilToSlot,
  formatTimeRange,
  formatLabRange,
} from "@/lib/time";
import { SLOT_MINUTES, RECENT_DAYS, BOOKINGS_PAGE_SIZE } from "@/config/rules";
import {
  ReservationKind,
  ReservationStatus,
  ResourceStatus,
  type Reservation,
} from "@/generated/prisma/client";

export interface ClashingBookingInfo {
  id: string;
  purpose: string;
  startAt: Date;
  endAt: Date;
  timeRange: string;
  createdBy: {
    id: string;
    name: string;
    email?: string;
  };
}

export interface ClashingMaintenanceInfo {
  id: string;
  purpose: string;
  startAt: Date;
  endAt: Date;
  timeRange: string;
}

export interface FindClashesResult {
  ok: boolean;
  error?: string;
  bookings: ClashingBookingInfo[];
  maintenanceBlocks: ClashingMaintenanceInfo[];
}

export interface CreateMaintenanceInput {
  resourceId: string;
  startAt: Date;
  endAt: Date;
  reason: string;
  cancelClashingBookings?: boolean;
}

export type CreateMaintenanceResult =
  | { ok: true; block: Reservation; cancelledCount: number }
  | {
      ok: false;
      error: string;
      needsConfirmation?: boolean;
      clashes?: ClashingBookingInfo[];
    };

/**
 * Finds all confirmed bookings and maintenance blocks overlapping a given time period
 * on a resource.
 */
export async function findClashes(
  actor: UserLike,
  resourceId: string,
  startAt: Date,
  endAt: Date,
  zone: string = env.APP_TIME_ZONE,
): Promise<FindClashesResult> {
  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    select: { id: true, siteId: true, status: true },
  });

  if (!resource || !canManageMaintenance(actor, { siteId: resource.siteId })) {
    return {
      ok: false,
      error: "Resource not found.",
      bookings: [],
      maintenanceBlocks: [],
    };
  }

  const reservations = await db.reservation.findMany({
    where: {
      resourceId,
      status: ReservationStatus.CONFIRMED,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { startAt: "asc" },
  });

  const bookings: ClashingBookingInfo[] = [];
  const maintenanceBlocks: ClashingMaintenanceInfo[] = [];

  for (const r of reservations) {
    if (r.kind === ReservationKind.BOOKING) {
      bookings.push({
        id: r.id,
        purpose: r.purpose,
        startAt: r.startAt,
        endAt: r.endAt,
        timeRange: formatTimeRange(r.startAt, r.endAt, zone),
        createdBy: {
          id: r.createdBy.id,
          name: r.createdBy.name,
          email: r.createdBy.email,
        },
      });
    } else if (r.kind === ReservationKind.MAINTENANCE) {
      maintenanceBlocks.push({
        id: r.id,
        purpose: r.purpose,
        startAt: r.startAt,
        endAt: r.endAt,
        timeRange: formatTimeRange(r.startAt, r.endAt, zone),
      });
    }
  }

  return { ok: true, bookings, maintenanceBlocks };
}

/**
 * Creates a MAINTENANCE block on a resource.
 * - Validates role (canManageMaintenance on stored site), status (not RETIRED), reason length (3-200)
 * - Validates slot boundaries, end after start, start not before startOfCurrentSlot(now)
 * - Refuses if clashes with another MAINTENANCE block
 * - If clashing bookings exist and cancelClashingBookings is false, returns needsConfirmation: true
 * - Otherwise in one transaction: cancels all overlapping bookings and creates the MAINTENANCE block
 */
export async function createMaintenanceBlock(
  actor: UserLike & { id: string },
  input: CreateMaintenanceInput,
  zone: string = env.APP_TIME_ZONE,
  now: Date = new Date(),
): Promise<CreateMaintenanceResult> {
  // a. Load resource & check permissions
  const resource = await db.resource.findUnique({
    where: { id: input.resourceId },
    select: { id: true, name: true, siteId: true, status: true },
  });

  if (!resource || !canManageMaintenance(actor, { siteId: resource.siteId })) {
    return { ok: false, error: "Resource not found." };
  }

  if (resource.status === ResourceStatus.RETIRED) {
    return { ok: false, error: "Retired resources cannot be scheduled for maintenance." };
  }

  const reason = input.reason?.trim() ?? "";
  if (reason.length < 3 || reason.length > 200) {
    return { ok: false, error: "Reason must be between 3 and 200 characters." };
  }

  // b. Validate slot timing
  if (!isOnSlotBoundary(input.startAt, zone) || !isOnSlotBoundary(input.endAt, zone)) {
    return { ok: false, error: "Maintenance must start and end on 15-minute marks." };
  }

  if (input.endAt.getTime() <= input.startAt.getTime()) {
    return { ok: false, error: "The end time must be after the start time." };
  }

  const currentSlot = startOfCurrentSlot(now, zone);
  if (input.startAt.getTime() < currentSlot.getTime()) {
    return { ok: false, error: "You can't block a time that has already passed." };
  }

  // c. Query existing CONFIRMED overlapping reservations
  const clashes = await db.reservation.findMany({
    where: {
      resourceId: resource.id,
      status: ReservationStatus.CONFIRMED,
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { startAt: "asc" },
  });

  const clashingMaintenance = clashes.find((c) => c.kind === ReservationKind.MAINTENANCE);
  if (clashingMaintenance) {
    return {
      ok: false,
      error: `Clashes with existing maintenance: "${clashingMaintenance.purpose}".`,
    };
  }

  const clashingBookings: ClashingBookingInfo[] = clashes
    .filter((c) => c.kind === ReservationKind.BOOKING)
    .map((b) => ({
      id: b.id,
      purpose: b.purpose,
      startAt: b.startAt,
      endAt: b.endAt,
      timeRange: formatTimeRange(b.startAt, b.endAt, zone),
      createdBy: {
        id: b.createdBy.id,
        name: b.createdBy.name,
        email: b.createdBy.email,
      },
    }));

  // d. If bookings clash and cancelClashingBookings is false, require confirmation
  if (clashingBookings.length > 0 && !input.cancelClashingBookings) {
    return {
      ok: false,
      error: `This block overlaps with ${clashingBookings.length} booking(s).`,
      needsConfirmation: true,
      clashes: clashingBookings,
    };
  }

  // e. One transaction: cancel clashing bookings and insert maintenance block
  try {
    const result = await db.$transaction(async (tx) => {
      let cancelledCount = 0;
      if (clashingBookings.length > 0) {
        const updateResult = await tx.reservation.updateMany({
          where: {
            id: { in: clashingBookings.map((b) => b.id) },
            status: ReservationStatus.CONFIRMED,
          },
          data: {
            status: ReservationStatus.CANCELLED,
            cancelReason: `Maintenance: ${reason}`,
            cancelledAt: now,
            cancelledById: actor.id,
          },
        });
        cancelledCount = updateResult.count;
      }

      const block = await tx.reservation.create({
        data: {
          resourceId: resource.id,
          kind: ReservationKind.MAINTENANCE,
          status: ReservationStatus.CONFIRMED,
          startAt: input.startAt,
          endAt: input.endAt,
          purpose: reason,
          createdById: actor.id,
        },
      });

      return { block, cancelledCount };
    });

    return {
      ok: true,
      block: result.block,
      cancelledCount: result.cancelledCount,
    };
  } catch (error) {
    if (isOverlapError(error)) {
      return {
        ok: false,
        error: "A new booking was made while you were reviewing. Please check again.",
      };
    }
    throw error;
  }
}

/**
 * Ends a running maintenance block immediately by shortening its endAt to the ceilToSlot(now).
 */
export async function endBlockNow(
  actor: UserLike,
  id: string,
  zone: string = env.APP_TIME_ZONE,
  now: Date = new Date(),
): Promise<{ ok: boolean; error?: string }> {
  const block = await db.reservation.findUnique({
    where: { id },
    include: { resource: { select: { id: true, siteId: true } } },
  });

  if (!block || block.kind !== ReservationKind.MAINTENANCE) {
    return { ok: false, error: "Maintenance block not found." };
  }

  if (!canManageMaintenance(actor, { siteId: block.resource.siteId })) {
    return { ok: false, error: "Resource not found." };
  }

  if (block.status !== ReservationStatus.CONFIRMED) {
    return { ok: false, error: "This maintenance block is not active." };
  }

  // Must be in progress: startAt <= now && endAt > now
  if (block.startAt > now || block.endAt <= now) {
    return { ok: false, error: "Only a running maintenance block can be ended now." };
  }

  let newEndAt = ceilToSlot(now, zone);
  // Ensure newEndAt is strictly after startAt
  if (newEndAt.getTime() <= block.startAt.getTime()) {
    newEndAt = new Date(block.startAt.getTime() + SLOT_MINUTES * 60 * 1000);
  }

  await db.reservation.update({
    where: { id: block.id },
    data: { endAt: newEndAt },
  });

  return { ok: true };
}

/**
 * Cancels a future maintenance block that has not started yet.
 */
export async function cancelBlock(
  actor: UserLike & { id: string },
  id: string,
  reason: string,
  now: Date = new Date(),
): Promise<{ ok: boolean; error?: string }> {
  const block = await db.reservation.findUnique({
    where: { id },
    include: { resource: { select: { id: true, siteId: true } } },
  });

  if (!block || block.kind !== ReservationKind.MAINTENANCE) {
    return { ok: false, error: "Maintenance block not found." };
  }

  if (!canManageMaintenance(actor, { siteId: block.resource.siteId })) {
    return { ok: false, error: "Resource not found." };
  }

  if (block.status !== ReservationStatus.CONFIRMED) {
    return { ok: false, error: "This maintenance block is already cancelled." };
  }

  if (block.startAt.getTime() <= now.getTime()) {
    return { ok: false, error: "Only a future maintenance block can be cancelled." };
  }

  const trimmedReason = reason?.trim() ?? "";
  if (trimmedReason.length < 3) {
    return { ok: false, error: "A cancellation reason of at least 3 characters is required." };
  }

  await db.reservation.update({
    where: { id: block.id },
    data: {
      status: ReservationStatus.CANCELLED,
      cancelReason: trimmedReason,
      cancelledAt: now,
      cancelledById: actor.id,
    },
  });

  return { ok: true };
}

export interface ListBlocksOptions {
  siteId?: string;
  range?: "upcoming" | "recent";
  page?: number;
  pageSize?: number;
}

export interface MaintenanceBlockItem {
  id: string;
  resourceId: string;
  resourceName: string;
  categoryName: string;
  iconKey: string;
  siteId: string;
  siteName: string;
  startAt: Date;
  endAt: Date;
  rangeFormatted: string;
  purpose: string;
  status: ReservationStatus;
  createdByName: string;
  isRunning: boolean;
  isFuture: boolean;
}

export interface ListBlocksResult {
  blocks: MaintenanceBlockItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Lists maintenance blocks according to role site scope and range.
 */
export async function listBlocks(
  actor: UserLike,
  options: ListBlocksOptions = {},
  zone: string = env.APP_TIME_ZONE,
  now: Date = new Date(),
): Promise<ListBlocksResult> {
  const allowedSites = bookingOversightSitesFor(actor);
  if (allowedSites !== "all" && allowedSites.length === 0) {
    return { blocks: [], totalCount: 0, page: 1, pageSize: BOOKINGS_PAGE_SIZE, totalPages: 0 };
  }

  let siteFilter: { in: string[] } | string | undefined = undefined;
  if (allowedSites === "all") {
    if (options.siteId && options.siteId !== "all") {
      siteFilter = options.siteId;
    }
  } else {
    // MANAGER: own site only; ignore any other siteId requested
    siteFilter = { in: allowedSites };
  }

  const range = options.range ?? "upcoming";
  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? BOOKINGS_PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const whereClause = {
    kind: ReservationKind.MAINTENANCE,
    resource: {
      ...(siteFilter ? { siteId: siteFilter } : {}),
    },
    ...(range === "upcoming"
      ? {
          status: ReservationStatus.CONFIRMED,
          endAt: { gt: now },
        }
      : {
          endAt: { lte: now, gte: subDays(now, RECENT_DAYS) },
        }),
  };

  const [totalCount, rawBlocks] = await Promise.all([
    db.reservation.count({ where: whereClause }),
    db.reservation.findMany({
      where: whereClause,
      include: {
        resource: {
          select: {
            id: true,
            name: true,
            siteId: true,
            site: { select: { id: true, name: true } },
            category: { select: { name: true, iconKey: true } },
          },
        },
        createdBy: { select: { name: true } },
      },
      orderBy: range === "upcoming" ? { startAt: "asc" } : { endAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  const blocks: MaintenanceBlockItem[] = rawBlocks.map((b) => {
    const isRunning =
      b.status === ReservationStatus.CONFIRMED &&
      b.startAt.getTime() <= now.getTime() &&
      b.endAt.getTime() > now.getTime();
    const isFuture =
      b.status === ReservationStatus.CONFIRMED && b.startAt.getTime() > now.getTime();

    return {
      id: b.id,
      resourceId: b.resource.id,
      resourceName: b.resource.name,
      categoryName: b.resource.category.name,
      iconKey: b.resource.category.iconKey,
      siteId: b.resource.site.id,
      siteName: b.resource.site.name,
      startAt: b.startAt,
      endAt: b.endAt,
      rangeFormatted: formatLabRange(b.startAt, b.endAt, zone),
      purpose: b.purpose,
      status: b.status,
      createdByName: b.createdBy.name,
      isRunning,
      isFuture,
    };
  });

  return {
    blocks,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export interface MaintenanceResourceItem {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
  categoryName: string;
  iconKey: string;
}

/**
 * Returns ACTIVE and OUT_OF_SERVICE resources of the sites the actor manages.
 */
export async function listMaintenanceResources(
  actor: UserLike,
): Promise<MaintenanceResourceItem[]> {
  const allowedSites = bookingOversightSitesFor(actor);
  if (allowedSites !== "all" && allowedSites.length === 0) {
    return [];
  }

  const resources = await db.resource.findMany({
    where: {
      status: { in: [ResourceStatus.ACTIVE, ResourceStatus.OUT_OF_SERVICE] },
      ...(allowedSites === "all" ? {} : { siteId: { in: allowedSites } }),
    },
    select: {
      id: true,
      name: true,
      siteId: true,
      site: { select: { id: true, name: true } },
      category: { select: { name: true, iconKey: true } },
    },
    orderBy: [{ site: { name: "asc" } }, { category: { name: "asc" } }, { name: "asc" }],
  });

  return resources.map((r) => ({
    id: r.id,
    name: r.name,
    siteId: r.site.id,
    siteName: r.site.name,
    categoryName: r.category.name,
    iconKey: r.category.iconKey,
  }));
}

/**
 * Returns a single maintenance block for details and permission checks.
 */
export async function getMaintenanceBlock(actor: UserLike, id: string) {
  const block = await db.reservation.findUnique({
    where: { id, kind: ReservationKind.MAINTENANCE },
    include: {
      resource: {
        select: {
          id: true,
          name: true,
          siteId: true,
          location: true,
          site: { select: { id: true, name: true } },
          category: { select: { name: true, iconKey: true } },
          section: { select: { name: true } },
        },
      },
      createdBy: { select: { id: true, name: true, role: true, email: true } },
      cancelledBy: { select: { name: true } },
    },
  });

  if (!block) {
    return null;
  }

  // Allow read if user is authenticated; modification checks are handled separately
  return block;
}
