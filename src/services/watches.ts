import "server-only";

import { z } from "zod";
import { addDays } from "date-fns";
import { db } from "@/lib/db";
import {
  ResourceStatus,
  ResourceWatchKind,
  ResourceWatchStatus,
  ReservationStatus,
  NotificationKind,
  type ResourceWatch,
} from "@/generated/prisma/client";
import type { UserLike } from "@/lib/permissions";
import { canWatchResource } from "@/lib/permissions";
import { env } from "@/lib/env";
import {
  WATCH_MAX_ACTIVE,
  WATCH_BACK_IN_SERVICE_DAYS,
  BOOKING_WINDOW_DAYS,
  SLOT_MINUTES,
} from "@/config/rules";
import {
  formatLabDate,
  formatLabTime,
  labDateString,
  startOfCurrentSlot,
  labDayStart,
  endOfLabDay,
} from "@/lib/time";
import { checkBookingTimes, checkCalibrationDue, formatDurationWords } from "@/lib/booking-rules";
import { isFree, freeStartTimes } from "@/lib/slot-finder";
import { notifyInTx } from "@/services/notifications";

export interface CreateWatchInput {
  resourceId: string;
  kind: ResourceWatchKind;
  wantedStart?: Date | string | null;
  wantedEnd?: Date | string | null;
  durationMinutes?: number | null;
  flexibleDay?: boolean;
}

const createWatchSchema = z.object({
  resourceId: z.string().uuid("Invalid resource ID"),
  kind: z.nativeEnum(ResourceWatchKind),
  wantedStart: z.coerce.date().optional().nullable(),
  wantedEnd: z.coerce.date().optional().nullable(),
  durationMinutes: z.coerce.number().int().positive().optional().nullable(),
  flexibleDay: z.boolean().optional().default(false),
});

export interface WatchItem {
  id: string;
  userId: string;
  resourceId: string;
  kind: ResourceWatchKind;
  status: ResourceWatchStatus;
  wantedStart: Date | null;
  wantedEnd: Date | null;
  durationMinutes: number | null;
  flexibleDay: boolean;
  expiresAt: Date;
  sentAt: Date | null;
  createdAt: Date;
  resource: {
    id: string;
    name: string;
    site: {
      id: string;
      name: string;
    };
  };
}

/**
 * Creates a resource watch alert ("Notify me when it's free" or "back in service").
 */
export async function createWatch(
  actor: UserLike,
  rawInput: unknown,
  zone: string = env.APP_TIME_ZONE,
  now: Date = new Date(),
): Promise<{ ok: boolean; error?: string; data?: ResourceWatch }> {
  if (!actor.id || !canWatchResource(actor)) {
    return {
      ok: false,
      error: "Admins do not book or set alerts. Use a staff or manager account.",
    };
  }

  const parsed = createWatchSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid alert input." };
  }

  const { resourceId, kind, flexibleDay } = parsed.data;
  let durationMinutes = parsed.data.durationMinutes ?? null;
  let wantedStart = parsed.data.wantedStart ?? null;
  let wantedEnd = parsed.data.wantedEnd ?? null;

  if (kind === ResourceWatchKind.SLOT_FREE && wantedStart && wantedEnd && !durationMinutes) {
    durationMinutes = Math.round((wantedEnd.getTime() - wantedStart.getTime()) / (60 * 1000));
  }

  // 1. Resource exists and is not RETIRED
  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    include: {
      category: { select: { maxBookingMinutes: true } },
    },
  });

  if (!resource) {
    return { ok: false, error: "Resource not found." };
  }

  if (resource.status === ResourceStatus.RETIRED) {
    return { ok: false, error: "Cannot set an alert on a retired resource." };
  }

  // 2. Max active alerts per user
  const activeCount = await db.resourceWatch.count({
    where: {
      userId: actor.id,
      status: ResourceWatchStatus.ACTIVE,
      expiresAt: { gt: now },
    },
  });

  if (activeCount >= WATCH_MAX_ACTIVE) {
    return {
      ok: false,
      error: `You can have at most ${WATCH_MAX_ACTIVE} active alerts.`,
    };
  }

  let expiresAt: Date;

  if (kind === ResourceWatchKind.BACK_IN_SERVICE) {
    if (resource.status !== ResourceStatus.OUT_OF_SERVICE) {
      return { ok: false, error: "This resource is already active." };
    }
    expiresAt = addDays(now, WATCH_BACK_IN_SERVICE_DAYS);
    wantedStart = null;
    wantedEnd = null;
  } else {
    // kind === SLOT_FREE
    if (!wantedStart || !wantedEnd || !durationMinutes) {
      return { ok: false, error: "A wanted start, end time, and duration are required." };
    }

    if (wantedEnd.getTime() <= wantedStart.getTime()) {
      return { ok: false, error: "The end time must be after the start time." };
    }

    // Check future
    const currentSlot = startOfCurrentSlot(now, zone);
    if (wantedStart.getTime() < currentSlot.getTime()) {
      return { ok: false, error: "Cannot create an alert for a past time." };
    }

    // Check booking window
    const maxWindow = addDays(now, BOOKING_WINDOW_DAYS);
    if (wantedStart.getTime() > maxWindow.getTime()) {
      return {
        ok: false,
        error: `Alerts can only be set within ${BOOKING_WINDOW_DAYS} days.`,
      };
    }

    // Check category limit
    if (durationMinutes > resource.category.maxBookingMinutes) {
      return {
        ok: false,
        error: `Duration exceeds maximum booking limit of ${formatDurationWords(resource.category.maxBookingMinutes)}.`,
      };
    }

    // Check if CURRENTLY bookable
    if (resource.status === ResourceStatus.ACTIVE) {
      const calibError = checkCalibrationDue({
        resourceName: resource.name,
        nextCalibrationDueOn: resource.nextCalibrationDueOn,
        endAt: wantedEnd,
        timeZone: zone,
      });

      if (!calibError) {
        // Check reservations overlap
        const clashes = await db.reservation.findMany({
          where: {
            resourceId,
            status: ReservationStatus.CONFIRMED,
            startAt: { lt: wantedEnd },
            endAt: { gt: wantedStart },
          },
          select: { id: true },
        });

        if (clashes.length === 0) {
          return { ok: false, error: "This time is free now - book it" };
        }
      }
    }

    expiresAt = wantedStart;
  }

  try {
    const watch = await db.resourceWatch.create({
      data: {
        userId: actor.id,
        resourceId,
        kind,
        status: ResourceWatchStatus.ACTIVE,
        wantedStart,
        wantedEnd,
        durationMinutes: kind === ResourceWatchKind.SLOT_FREE ? durationMinutes : null,
        flexibleDay: kind === ResourceWatchKind.SLOT_FREE ? Boolean(flexibleDay) : false,
        expiresAt,
      },
    });

    return { ok: true, data: watch };
  } catch {
    return {
      ok: false,
      error: "You already have an active alert for this resource and time.",
    };
  }
}

/**
 * Lists watches for the current actor.
 */
export async function listMyWatches(actor: UserLike): Promise<WatchItem[]> {
  if (!actor.id) {
    return [];
  }

  return db.resourceWatch.findMany({
    where: { userId: actor.id },
    include: {
      resource: {
        select: {
          id: true,
          name: true,
          site: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Cancels a watch owned by the actor. Returns not found if not owned by actor.
 */
export async function cancelMyWatch(
  actor: UserLike,
  watchId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!actor.id) {
    return { ok: false, error: "Not authenticated" };
  }

  const watch = await db.resourceWatch.findUnique({
    where: { id: watchId },
    select: { id: true, userId: true, status: true },
  });

  if (!watch || watch.userId !== actor.id) {
    return { ok: false, error: "Alert not found." };
  }

  if (watch.status === ResourceWatchStatus.ACTIVE) {
    await db.resourceWatch.update({
      where: { id: watchId },
      data: { status: ResourceWatchStatus.CANCELLED },
    });
  }

  return { ok: true };
}

/**
 * Checks active watches for a resource when availability may have opened up.
 * Reuses createBooking rules: ACTIVE status, calibration due day, category limit, slot marks, and no overlap.
 * Runs in best-effort mode (logs errors, never throws).
 */
export async function checkWatchesForResource(
  resourceId: string,
  zone: string = env.APP_TIME_ZONE,
  now: Date = new Date(),
): Promise<void> {
  try {
    const resource = await db.resource.findUnique({
      where: { id: resourceId },
      include: {
        category: { select: { maxBookingMinutes: true } },
      },
    });

    if (!resource || resource.status === ResourceStatus.RETIRED) {
      return;
    }

    // Expire active watches past their expiry date
    await db.resourceWatch.updateMany({
      where: {
        resourceId,
        status: ResourceWatchStatus.ACTIVE,
        expiresAt: { lte: now },
      },
      data: { status: ResourceWatchStatus.EXPIRED },
    });

    // If resource is not ACTIVE, BACK_IN_SERVICE and SLOT_FREE cannot fire
    if (resource.status !== ResourceStatus.ACTIVE) {
      return;
    }

    const activeWatches = await db.resourceWatch.findMany({
      where: {
        resourceId,
        status: ResourceWatchStatus.ACTIVE,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "asc" },
    });

    if (activeWatches.length === 0) {
      return;
    }

    // Load confirmed reservations from now onwards
    const confirmedReservations = await db.reservation.findMany({
      where: {
        resourceId,
        status: ReservationStatus.CONFIRMED,
        endAt: { gt: now },
      },
      select: { startAt: true, endAt: true },
    });

    const busy = confirmedReservations.map((r) => ({
      start: r.startAt,
      end: r.endAt,
    }));

    for (const watch of activeWatches) {
      if (watch.kind === ResourceWatchKind.BACK_IN_SERVICE) {
        // Fires because resource.status === ACTIVE
        await db.$transaction(async (tx) => {
          await tx.resourceWatch.update({
            where: { id: watch.id },
            data: {
              status: ResourceWatchStatus.SENT,
              sentAt: now,
            },
          });

          await notifyInTx(tx, [watch.userId], {
            kind: NotificationKind.RESOURCE_BACK_IN_SERVICE,
            title: `${resource.name} is back in service`,
            body: `${resource.name} is now back in service and available for booking. Bookings are first come, first served.`,
            link: `/bookings/new?resourceId=${resource.id}`,
            resourceId: resource.id,
            dedupeKey: `watch:${watch.id}`,
          });
        });
        continue;
      }

      if (watch.kind === ResourceWatchKind.SLOT_FREE) {
        let matchStart: Date | null = null;
        let matchEnd: Date | null = null;

        if (!watch.flexibleDay && watch.wantedStart && watch.wantedEnd) {
          const start = watch.wantedStart;
          const end = watch.wantedEnd;

          // Same validation checks as createBooking
          const timeError = checkBookingTimes({
            startAt: start,
            endAt: end,
            now,
            maxBookingMinutes: resource.category.maxBookingMinutes,
            zone,
          });

          const calibError = checkCalibrationDue({
            resourceName: resource.name,
            nextCalibrationDueOn: resource.nextCalibrationDueOn,
            endAt: end,
            timeZone: zone,
          });

          if (!timeError && !calibError && isFree(busy, start, end)) {
            matchStart = start;
            matchEnd = end;
          }
        } else if (watch.flexibleDay && watch.wantedStart && watch.durationMinutes) {
          const dateStr = labDateString(watch.wantedStart, zone);
          const dayStart = labDayStart(dateStr, zone);
          const dayEnd = endOfLabDay(dateStr, zone);
          const earliest = startOfCurrentSlot(now, zone);

          const starts = freeStartTimes({
            busy,
            dayStart,
            dayEnd,
            earliest,
            durationMinutes: watch.durationMinutes,
            stepMinutes: SLOT_MINUTES,
          });

          for (const s of starts) {
            const e = new Date(s.getTime() + watch.durationMinutes * 60 * 1000);
            const timeError = checkBookingTimes({
              startAt: s,
              endAt: e,
              now,
              maxBookingMinutes: resource.category.maxBookingMinutes,
              zone,
            });
            const calibError = checkCalibrationDue({
              resourceName: resource.name,
              nextCalibrationDueOn: resource.nextCalibrationDueOn,
              endAt: e,
              timeZone: zone,
            });
            if (!timeError && !calibError) {
              matchStart = s;
              matchEnd = e;
              break;
            }
          }
        }

        if (matchStart && matchEnd) {
          const startIso = matchStart.toISOString();
          const endIso = matchEnd.toISOString();
          const dateLabel = formatLabDate(matchStart, zone);
          const startTimeLabel = formatLabTime(matchStart, zone);
          const endTimeLabel = formatLabTime(matchEnd, zone);

          await db.$transaction(async (tx) => {
            await tx.resourceWatch.update({
              where: { id: watch.id },
              data: {
                status: ResourceWatchStatus.SENT,
                sentAt: now,
              },
            });

            await notifyInTx(tx, [watch.userId], {
              kind: NotificationKind.SLOT_FREE,
              title: `Time slot available: ${resource.name}`,
              body: `A time slot on ${resource.name} is now available on ${dateLabel} from ${startTimeLabel} to ${endTimeLabel}. Bookings are first come, first served.`,
              link: `/bookings/new?resourceId=${resource.id}&start=${startIso}&end=${endIso}`,
              resourceId: resource.id,
              dedupeKey: `watch:${watch.id}`,
            });
          });
        }
      }
    }
  } catch (err) {
    console.error(`[watches] Error checking watches for resource ${resourceId}:`, err);
  }
}
