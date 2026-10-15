import "server-only";

import { subDays, addDays, differenceInCalendarDays } from "date-fns";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { checkBookingTimes, checkAttendees, checkCalibrationDue } from "@/lib/booking-rules";
import {
  canBook,
  canCancelBooking,
  canOverseeBookings,
  bookingOversightSitesFor,
} from "@/lib/permissions";
import { isOverlapError } from "@/lib/db-errors";
import {
  formatLabRange,
  labDayStart,
  endOfLabDay,
  labDateString,
  labTimeString,
  labToday,
  startOfCurrentSlot,
  formatLabDate,
  formatLabTime,
} from "@/lib/time";
import { freeStartTimes, nearestStarts, type TimeRange } from "@/lib/slot-finder";
import {
  RECENT_DAYS,
  SLOT_MINUTES,
  FIND_SLOT_SUGGESTIONS,
  BOOKINGS_PAGE_SIZE,
  USAGE_MAX_DAYS,
} from "@/config/rules";
import { NotificationKind, type Reservation, type Role } from "@/generated/prisma/client";
import { notifyInTx } from "@/services/notifications";
import { checkWatchesForResource } from "@/services/watches";

export interface BookingActor {
  id: string;
  name?: string;
  role: Role | string;
  siteId?: string | null;
}

export interface CreateBookingInput {
  resourceId: string;
  startAt: Date;
  endAt: Date;
  purpose: string;
  attendeeCount?: number | null;
}

export type CreateBookingResult =
  | { ok: true; data: Reservation }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
      suggestions?: string[];
    };

/**
 * Creates a confirmed booking for a resource.
 * Enforces business rules and clash prevention:
 * a. Loads resource and its category (checks OUT_OF_SERVICE and RETIRED).
 * b. Checks booking times, attendees, and purpose length.
 * c. Checks existing CONFIRMED overlapping reservations to return a friendly clash message.
 * d. Inserts into the database. If isOverlapError occurs, returns concurrency conflict message.
 */
export async function createBooking(
  actor: BookingActor,
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  if (!canBook(actor)) {
    return {
      ok: false,
      error: "Admins manage the network and do not book. Use a staff or manager account.",
    };
  }

  const resource = await db.resource.findUnique({
    where: { id: input.resourceId },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          maxBookingMinutes: true,
        },
      },
      site: {
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

  if (resource.status === "OUT_OF_SERVICE") {
    return { ok: false, error: "This resource is out of service." };
  }

  if (resource.status === "RETIRED") {
    return { ok: false, error: "This resource has been retired." };
  }

  // Check booking times
  const timeError = checkBookingTimes({
    startAt: input.startAt,
    endAt: input.endAt,
    now: new Date(),
    maxBookingMinutes: resource.category.maxBookingMinutes,
  });
  if (timeError) {
    return { ok: false, error: timeError };
  }

  // Check calibration due day (ISO 15189:2022 6.4.6)
  const calibError = checkCalibrationDue({
    resourceName: resource.name,
    nextCalibrationDueOn: resource.nextCalibrationDueOn,
    endAt: input.endAt,
    timeZone: env.APP_TIME_ZONE,
  });
  if (calibError) {
    return { ok: false, error: calibError };
  }

  // Check attendees
  const attendeeError = checkAttendees(resource.capacity, input.attendeeCount);
  if (attendeeError) {
    return { ok: false, error: attendeeError };
  }

  // Check purpose
  const trimmedPurpose = input.purpose ? input.purpose.trim() : "";
  if (trimmedPurpose.length < 3 || trimmedPurpose.length > 200) {
    return {
      ok: false,
      error: "Purpose must be between 3 and 200 characters.",
      fieldErrors: { purpose: ["Purpose must be between 3 and 200 characters."] },
    };
  }

  // Look for a CONFIRMED reservation of this resource that clashes:
  // startAt before the new end AND endAt after the new start
  const clash = await db.reservation.findFirst({
    where: {
      resourceId: input.resourceId,
      status: "CONFIRMED",
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
    },
    include: {
      createdBy: {
        select: { name: true },
      },
    },
  });

  if (clash) {
    if (clash.kind === "BOOKING") {
      const personName = clash.createdBy?.name ?? "another user";
      const rangeStr = formatLabRange(clash.startAt, clash.endAt);
      return {
        ok: false,
        error: `This time clashes with ${personName}'s booking, ${rangeStr}.`,
      };
    } else {
      const rangeStr = formatLabRange(clash.startAt, clash.endAt);
      return {
        ok: false,
        error: `This time clashes with maintenance (${clash.purpose}), ${rangeStr}.`,
      };
    }
  }

  try {
    const reservation = await db.reservation.create({
      data: {
        resourceId: input.resourceId,
        createdById: actor.id,
        kind: "BOOKING",
        status: "CONFIRMED",
        purpose: trimmedPurpose,
        attendeeCount: resource.capacity ? (input.attendeeCount ?? null) : null,
        startAt: input.startAt,
        endAt: input.endAt,
      },
    });

    return { ok: true, data: reservation };
  } catch (error: unknown) {
    // Database exclusion constraint guarantees zero clashes under concurrent race conditions
    if (isOverlapError(error)) {
      const zone = env.APP_TIME_ZONE;
      const durationMinutes = Math.round(
        (input.endAt.getTime() - input.startAt.getTime()) / (60 * 1000),
      );

      let suggestions: string[] = [];
      try {
        const dateStr = labDateString(input.startAt, zone);
        const dayStart = labDayStart(dateStr, zone);
        const dayEnd = addDays(dayStart, 1);
        const searchEnd = new Date(dayEnd.getTime() + durationMinutes * 60 * 1000);

        const dayReservations = await db.reservation.findMany({
          where: {
            resourceId: input.resourceId,
            status: "CONFIRMED",
            startAt: { lt: searchEnd },
            endAt: { gt: dayStart },
          },
          select: { startAt: true, endAt: true },
        });

        const busyRanges: TimeRange[] = dayReservations.map((r) => ({
          start: r.startAt,
          end: r.endAt,
        }));

        const isToday = dateStr === labToday(zone);
        const earliest = isToday ? startOfCurrentSlot(new Date(), zone) : dayStart;

        const available = freeStartTimes({
          busy: busyRanges,
          dayStart,
          dayEnd,
          earliest,
          durationMinutes,
          stepMinutes: SLOT_MINUTES,
        });

        const nearest = nearestStarts(available, input.startAt, FIND_SLOT_SUGGESTIONS);
        suggestions = nearest.map((d) => labTimeString(d, zone));
      } catch {
        suggestions = [];
      }

      return {
        ok: false,
        error: `Someone booked ${resource.name} a moment ago.`,
        suggestions,
      };
    }
    throw error;
  }
}

export type CancelBookingResult =
  | { ok: true; data: Reservation }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Cancels a confirmed booking.
 * Enforces permissions and valid cancellation reason (3-200 chars).
 */
export async function cancelBooking(
  actor: BookingActor,
  reservationId: string,
  reason: string,
): Promise<CancelBookingResult> {
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    include: {
      resource: {
        select: { id: true, name: true, siteId: true },
      },
    },
  });

  if (!reservation) {
    return { ok: false, error: "Reservation not found." };
  }

  if (reservation.kind !== "BOOKING") {
    return { ok: false, error: "Cannot cancel a maintenance block with this action." };
  }

  if (reservation.status !== "CONFIRMED") {
    return { ok: false, error: "Only confirmed bookings can be cancelled." };
  }

  const now = new Date();
  if (reservation.startAt.getTime() <= now.getTime()) {
    return {
      ok: false,
      error: "Cannot cancel a booking that has already started.",
    };
  }

  if (!canCancelBooking(actor, reservation)) {
    return {
      ok: false,
      error: "You are not authorized to cancel this reservation.",
    };
  }

  const trimmedReason = reason ? reason.trim() : "";
  if (trimmedReason.length < 3 || trimmedReason.length > 200) {
    return {
      ok: false,
      error: "Cancellation reason must be between 3 and 200 characters.",
      fieldErrors: { reason: ["Cancellation reason must be between 3 and 200 characters."] },
    };
  }

  const updated = await db.$transaction(async (tx) => {
    const res = await tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: "CANCELLED",
        cancelReason: trimmedReason,
        cancelledAt: now,
        cancelledById: actor.id,
      },
    });

    if (reservation.createdById !== actor.id) {
      const zone = env.APP_TIME_ZONE;
      await notifyInTx(tx, [reservation.createdById], {
        kind: NotificationKind.BOOKING_CANCELLED,
        title: `Booking cancelled: ${reservation.resource.name}`,
        body: `Your booking for ${reservation.resource.name} on ${formatLabDate(reservation.startAt, zone)} from ${formatLabTime(reservation.startAt, zone)} to ${formatLabTime(reservation.endAt, zone)} was cancelled. Reason: ${trimmedReason}.`,
        link: "/bookings?tab=cancelled",
        resourceId: reservation.resource.id,
        dedupeKey: `booking-cancelled:${reservation.id}`,
        actorId: actor.id,
      });
    }

    return res;
  });

  checkWatchesForResource(reservation.resource.id).catch((err) =>
    console.error("[watches] Error checking watches on cancelBooking:", err),
  );

  return { ok: true, data: updated };
}

export interface OversightBookingFilters {
  from?: string;
  to?: string;
  siteId?: string;
  resourceId?: string;
  person?: string;
  status?: "CONFIRMED" | "CANCELLED" | "ALL";
  page?: number;
  pageSize?: number;
}

export interface OversightBookingItem {
  id: string;
  startAt: Date;
  endAt: Date;
  formattedRange: string;
  purpose: string;
  status: string;
  hasStarted: boolean;
  canCancel: boolean;
  cancelReason?: string | null;
  cancelledAt?: Date | null;
  cancelledBy?: {
    id: string;
    name: string;
  } | null;
  resource: {
    id: string;
    name: string;
    siteId: string;
    site: {
      id: string;
      name: string;
    };
    category: {
      name: string;
      iconKey: string;
    };
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ListOversightResult {
  items: OversightBookingItem[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  query: {
    from: string;
    to: string;
    siteId?: string;
    resourceId?: string;
    person?: string;
    status: "CONFIRMED" | "CANCELLED" | "ALL";
  };
}

/**
 * Lists bookings for oversight (Managers see own site only; Admins see all sites).
 */
export async function listBookingsForOversight(
  actor: BookingActor,
  filters: OversightBookingFilters = {},
): Promise<ListOversightResult> {
  const zone = env.APP_TIME_ZONE;
  const now = new Date();

  const allowedSites = bookingOversightSitesFor(actor);
  if (!canOverseeBookings(actor) || (Array.isArray(allowedSites) && allowedSites.length === 0)) {
    return {
      items: [],
      totalCount: 0,
      totalPages: 1,
      page: 1,
      pageSize: BOOKINGS_PAGE_SIZE,
      query: {
        from: labToday(zone),
        to: labDateString(addDays(now, 7), zone),
        status: "CONFIRMED",
      },
    };
  }

  // Parse dates with fallbacks
  const fromStr =
    filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from) ? filters.from : labToday(zone);
  let toStr =
    filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)
      ? filters.to
      : labDateString(addDays(now, 7), zone);

  const fromDate = labDayStart(fromStr, zone);
  let toDate = endOfLabDay(toStr, zone);

  // Clamp date range: at most USAGE_MAX_DAYS apart, and toDate >= fromDate
  const daysDiff = differenceInCalendarDays(toDate, fromDate);
  if (daysDiff < 0 || daysDiff > USAGE_MAX_DAYS) {
    toStr = labDateString(addDays(fromDate, 7), zone);
    toDate = endOfLabDay(toStr, zone);
  }

  const where: Record<string, unknown> = {
    kind: "BOOKING",
    startAt: {
      gte: fromDate,
      lt: toDate,
    },
  };

  // Status filter (default CONFIRMED)
  const statusParam = filters.status ?? "CONFIRMED";
  if (statusParam === "CONFIRMED") {
    where.status = "CONFIRMED";
  } else if (statusParam === "CANCELLED") {
    where.status = "CANCELLED";
  } else if (statusParam === "ALL") {
    where.status = { in: ["CONFIRMED", "CANCELLED"] };
  }

  // Site scoping
  if (allowedSites === "all") {
    if (filters.siteId && filters.siteId !== "all") {
      where.resource = { siteId: filters.siteId };
    }
  } else {
    // MANAGER: own site only, ignore any other site in filters
    where.resource = { siteId: { in: allowedSites } };
  }

  // Resource filter
  if (filters.resourceId && filters.resourceId !== "all") {
    where.resourceId = filters.resourceId;
  }

  // Person filter (name search case-insensitive)
  if (filters.person && filters.person.trim().length > 0) {
    where.createdBy = {
      name: {
        contains: filters.person.trim(),
        mode: "insensitive",
      },
    };
  }

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, filters.pageSize ?? BOOKINGS_PAGE_SIZE);

  const totalCount = await db.reservation.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const rows = await db.reservation.findMany({
    where,
    orderBy: { startAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      kind: true,
      status: true,
      startAt: true,
      endAt: true,
      purpose: true,
      cancelReason: true,
      cancelledAt: true,
      cancelledBy: {
        select: {
          id: true,
          name: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      resource: {
        select: {
          id: true,
          name: true,
          siteId: true,
          site: {
            select: {
              id: true,
              name: true,
            },
          },
          category: {
            select: {
              name: true,
              iconKey: true,
            },
          },
        },
      },
    },
  });

  const items: OversightBookingItem[] = rows.map((r) => {
    const hasStarted = r.startAt.getTime() <= now.getTime();
    const canCancel = r.status === "CONFIRMED" && !hasStarted && canCancelBooking(actor, r);

    return {
      id: r.id,
      startAt: r.startAt,
      endAt: r.endAt,
      formattedRange: formatLabRange(r.startAt, r.endAt, zone),
      purpose: r.purpose,
      status: r.status,
      hasStarted,
      canCancel,
      cancelReason: r.cancelReason,
      cancelledAt: r.cancelledAt,
      cancelledBy: r.cancelledBy,
      resource: r.resource,
      createdBy: r.createdBy,
    };
  });

  return {
    items,
    totalCount,
    totalPages,
    page,
    pageSize,
    query: {
      from: fromStr,
      to: toStr,
      siteId: allowedSites === "all" ? filters.siteId : undefined,
      resourceId: filters.resourceId,
      person: filters.person,
      status: statusParam,
    },
  };
}

/**
 * Loads a single reservation with resource, site, category, section, createdBy, and cancelledBy.
 */
export async function getReservation(id: string) {
  return db.reservation.findUnique({
    where: { id },
    include: {
      resource: {
        include: {
          site: true,
          category: true,
          section: true,
        },
      },
      createdBy: {
        select: { id: true, name: true, email: true, role: true },
      },
      cancelledBy: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });
}

/**
 * Lists the bookings made by an actor:
 * - upcoming: CONFIRMED, ends after now, sorted ascending by startAt
 * - past: CONFIRMED, ended within RECENT_DAYS, sorted descending by startAt
 * - cancelled: CANCELLED within RECENT_DAYS, with who cancelled it and why, sorted descending by cancelledAt
 */
export async function listMyBookings(actor: BookingActor, now: Date = new Date()) {
  const recentCutoff = subDays(now, RECENT_DAYS);

  const [upcoming, past, cancelled] = await Promise.all([
    // upcoming: CONFIRMED, ends after now
    db.reservation.findMany({
      where: {
        createdById: actor.id,
        kind: "BOOKING",
        status: "CONFIRMED",
        endAt: { gt: now },
      },
      include: {
        resource: {
          include: {
            site: true,
            category: true,
            section: true,
          },
        },
      },
      orderBy: { startAt: "asc" },
    }),

    // past: CONFIRMED, ended within RECENT_DAYS
    db.reservation.findMany({
      where: {
        createdById: actor.id,
        kind: "BOOKING",
        status: "CONFIRMED",
        endAt: { lte: now, gte: recentCutoff },
      },
      include: {
        resource: {
          include: {
            site: true,
            category: true,
            section: true,
          },
        },
      },
      orderBy: { startAt: "desc" },
    }),

    // cancelled: cancelled within RECENT_DAYS
    db.reservation.findMany({
      where: {
        createdById: actor.id,
        kind: "BOOKING",
        status: "CANCELLED",
        cancelledAt: { gte: recentCutoff },
      },
      include: {
        resource: {
          include: {
            site: true,
            category: true,
            section: true,
          },
        },
        cancelledBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { cancelledAt: "desc" },
    }),
  ]);

  return { upcoming, past, cancelled };
}
