import "server-only";

import { subDays, addDays } from "date-fns";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { checkBookingTimes, checkAttendees } from "@/lib/booking-rules";
import { canCancelReservation } from "@/lib/permissions";
import { isOverlapError } from "@/lib/db-errors";
import {
  formatLabRange,
  labDayStart,
  labDateString,
  labTimeString,
  labToday,
  startOfCurrentSlot,
} from "@/lib/time";
import { freeStartTimes, nearestStarts, type TimeRange } from "@/lib/slot-finder";
import { RECENT_DAYS, SLOT_MINUTES, FIND_SLOT_SUGGESTIONS } from "@/config/rules";
import type { Reservation, Role } from "@/generated/prisma/client";

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
        select: { siteId: true },
      },
    },
  });

  if (!reservation) {
    return { ok: false, error: "Reservation not found." };
  }

  const now = new Date();
  if (!canCancelReservation(actor, reservation, now)) {
    return {
      ok: false,
      error: "You are not authorized to cancel this reservation, or it has already started.",
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

  const updated = await db.reservation.update({
    where: { id: reservationId },
    data: {
      status: "CANCELLED",
      cancelReason: trimmedReason,
      cancelledAt: now,
      cancelledById: actor.id,
    },
  });

  return { ok: true, data: updated };
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
