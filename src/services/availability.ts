import "server-only";

import { z } from "zod";
import { addDays } from "date-fns";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  SLOT_MINUTES,
  BOOKING_WINDOW_DAYS,
  FIND_SLOT_DEFAULT_DURATION_MINUTES,
  FIND_SLOT_DURATIONS_MINUTES,
  FIND_SLOT_SUGGESTIONS,
} from "@/config/rules";
import {
  labToday,
  labDateString,
  labTimeString,
  labDayStart,
  addLabDays,
  parseLabDateTime,
  ceilToSlot,
  startOfCurrentSlot,
  isOnSlotBoundary,
  formatLabTime,
} from "@/lib/time";
import { formatDurationWords } from "@/lib/booking-rules";
import { isFree, freeStartTimes, nearestStarts, type TimeRange } from "@/lib/slot-finder";
import type { BookingActor } from "@/services/bookings";

export interface FindSlotsQueryInput {
  date?: string;
  start?: string;
  duration?: number | string;
  categoryId?: string;
  sectionId?: string;
  siteId?: string;
  people?: number | string;
  q?: string;
  freeOnly?: string | boolean;
}

export type SlotItemState =
  "AVAILABLE" | "BUSY" | "OUT_OF_SERVICE" | "TOO_LONG" | "TOO_SMALL" | "CALIBRATION";

export interface SlotSuggestion {
  start: Date;
  end: Date;
  startTimeStr: string;
  endTimeStr: string;
  label: string;
  ariaLabel: string;
  href: string;
}

export interface SlotItem {
  id: string;
  name: string;
  capacity: number | null;
  location: string | null;
  status: string;
  site: {
    id: string;
    name: string;
  };
  section: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
    maxBookingMinutes: number;
    iconKey: string;
  };
  state: SlotItemState;
  stateReason?: string;
  suggestions: SlotSuggestion[];
  bookHref: string;
}

export interface FindSlotsResult {
  query: {
    date: string;
    start: string;
    duration: number;
    categoryId?: string;
    sectionId?: string;
    siteId: string;
    people?: number;
    q?: string;
    freeOnly: boolean;
  };
  items: SlotItem[];
  counts: {
    available: number;
    total: number;
  };
  note?: string;
  requestedStartAt: Date;
  requestedEndAt: Date;
}

const rawQuerySchema = z.object({
  date: z.string().optional(),
  start: z.string().optional(),
  duration: z.coerce.number().optional(),
  categoryId: z.string().optional(),
  sectionId: z.string().optional(),
  siteId: z.string().optional(),
  people: z.coerce.number().optional(),
  q: z.string().optional(),
  freeOnly: z.union([z.string(), z.boolean()]).optional(),
});

/**
 * Bus-booking style availability search across all resources.
 * Returns free items first with a Book link, busy items with nearest suggestion buttons,
 * and unusable items with specific reasons.
 */
export async function findSlots(
  actor: BookingActor,
  rawQuery: FindSlotsQueryInput = {},
  now: Date = new Date(),
): Promise<FindSlotsResult> {
  const zone = env.APP_TIME_ZONE;
  const parsed = rawQuerySchema.safeParse(rawQuery);
  const input = parsed.success ? parsed.data : {};

  const notes: string[] = [];

  // 1. Date resolution
  const todayStr = labToday(zone);
  const maxAdvanceDateStr = addLabDays(todayStr, BOOKING_WINDOW_DAYS, zone);

  let cleanedDate = todayStr;
  if (input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    if (input.date < todayStr) {
      notes.push("Past dates cannot be searched. Showing today.");
      cleanedDate = todayStr;
    } else if (input.date > maxAdvanceDateStr) {
      notes.push(
        `Bookings can be made at most ${BOOKING_WINDOW_DAYS} days in advance. Showing today.`,
      );
      cleanedDate = todayStr;
    } else {
      cleanedDate = input.date;
    }
  } else if (input.date) {
    notes.push("Invalid date format. Showing today.");
    cleanedDate = todayStr;
  }

  // 2. Start time resolution
  const isToday = cleanedDate === todayStr;
  let defaultStart = "08:00";
  if (isToday) {
    const nextSlotMark = ceilToSlot(new Date(now.getTime() + 1000), zone);
    const nextSlotDateStr = labDateString(nextSlotMark, zone);
    if (nextSlotDateStr === todayStr) {
      defaultStart = labTimeString(nextSlotMark, zone);
    }
  }

  let cleanedStart = defaultStart;
  if (input.start && /^([01]\d|2[0-3]):[0-5]\d$/.test(input.start)) {
    try {
      const candidateStartAt = parseLabDateTime(cleanedDate, input.start, zone);
      if (!isOnSlotBoundary(candidateStartAt, zone)) {
        notes.push("Times must be on 15-minute marks. Adjusted start time.");
        cleanedStart = defaultStart;
      } else if (isToday && candidateStartAt.getTime() < startOfCurrentSlot(now, zone).getTime()) {
        notes.push("Start time has already passed. Showing the next available slot.");
        cleanedStart = defaultStart;
      } else {
        cleanedStart = input.start;
      }
    } catch {
      cleanedStart = defaultStart;
    }
  } else if (input.start) {
    notes.push("Invalid time format. Showing default start time.");
    cleanedStart = defaultStart;
  }

  // 3. Duration resolution
  let cleanedDuration = FIND_SLOT_DEFAULT_DURATION_MINUTES;
  if (
    input.duration &&
    (FIND_SLOT_DURATIONS_MINUTES as readonly number[]).includes(input.duration)
  ) {
    cleanedDuration = input.duration;
  }

  // 4. Site resolution
  let cleanedSiteId = "any";
  if (input.siteId && input.siteId.trim() !== "") {
    cleanedSiteId = input.siteId.trim();
  } else {
    // Default: actor's home site, or "any" for ADMIN without a site
    if (actor.role === "ADMIN" && !actor.siteId) {
      cleanedSiteId = "any";
    } else {
      cleanedSiteId = actor.siteId || "any";
    }
  }

  // 5. Category & Section filters
  const cleanedCategoryId =
    input.categoryId && input.categoryId.trim() !== "" && input.categoryId !== "all"
      ? input.categoryId.trim()
      : undefined;

  const cleanedSectionId =
    input.sectionId && input.sectionId.trim() !== "" && input.sectionId !== "all"
      ? input.sectionId.trim()
      : undefined;

  // 6. People (room capacity filter)
  let cleanedPeople: number | undefined = undefined;
  if (
    input.people !== undefined &&
    Number.isInteger(input.people) &&
    input.people >= 1 &&
    input.people <= 500
  ) {
    cleanedPeople = input.people;
  }

  // 7. Search text
  const cleanedQ = input.q && input.q.trim() !== "" ? input.q.trim() : undefined;

  // 8. Free only toggle
  const isFreeOnly = input.freeOnly === "1" || input.freeOnly === true || input.freeOnly === "true";

  // Build candidate resource filter
  const resourceWhere: Record<string, unknown> = {
    status: { not: "RETIRED" },
  };

  if (cleanedSiteId !== "any") {
    resourceWhere.siteId = cleanedSiteId;
  }
  if (cleanedCategoryId) {
    resourceWhere.categoryId = cleanedCategoryId;
  }
  if (cleanedSectionId) {
    resourceWhere.sectionId = cleanedSectionId;
  }
  if (cleanedQ) {
    resourceWhere.name = { contains: cleanedQ, mode: "insensitive" };
  }

  // ONE Query to load all matching candidate resources
  const candidateResources = await db.resource.findMany({
    where: resourceWhere,
    select: {
      id: true,
      name: true,
      capacity: true,
      location: true,
      status: true,
      siteId: true,
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
      category: {
        select: {
          id: true,
          name: true,
          maxBookingMinutes: true,
          iconKey: true,
        },
      },
    },
  });

  const requestedStartAt = parseLabDateTime(cleanedDate, cleanedStart, zone);
  const requestedEndAt = new Date(requestedStartAt.getTime() + cleanedDuration * 60 * 1000);

  const dayStart = labDayStart(cleanedDate, zone);
  const dayEnd = addDays(dayStart, 1);
  const searchEnd = new Date(dayEnd.getTime() + cleanedDuration * 60 * 1000);

  // ONE Query to load all confirmed reservations (BOOKING & MAINTENANCE) for all candidate resources
  const resourceIds = candidateResources.map((r) => r.id);
  const reservations =
    resourceIds.length === 0
      ? []
      : await db.reservation.findMany({
          where: {
            resourceId: { in: resourceIds },
            status: "CONFIRMED",
            startAt: { lt: searchEnd },
            endAt: { gt: dayStart },
          },
          select: {
            resourceId: true,
            startAt: true,
            endAt: true,
            kind: true,
            purpose: true,
          },
          orderBy: { startAt: "asc" },
        });

  // Group reservations by resourceId
  const reservationsByResource = new Map<
    string,
    Array<{ startAt: Date; endAt: Date; kind: string; purpose: string }>
  >();
  for (const res of reservations) {
    const list = reservationsByResource.get(res.resourceId) ?? [];
    list.push(res);
    reservationsByResource.set(res.resourceId, list);
  }

  const earliestTimeForSuggestions = isToday
    ? ceilToSlot(new Date(now.getTime() + 1000), zone)
    : dayStart;

  const rawItems: SlotItem[] = [];

  for (const resource of candidateResources) {
    const resReservations = reservationsByResource.get(resource.id) ?? [];
    const busyRanges: TimeRange[] = resReservations.map((r) => ({
      start: r.startAt,
      end: r.endAt,
    }));

    // Evaluate state in strict order:
    // 1. OUT_OF_SERVICE
    // 2. TOO_LONG
    // 3. TOO_SMALL
    // 4. CALIBRATION (E1 future proofing)
    // 5. BUSY
    // 6. AVAILABLE
    let state: SlotItemState;
    let stateReason: string | undefined = undefined;

    if (resource.status === "OUT_OF_SERVICE") {
      state = "OUT_OF_SERVICE";
      stateReason = "Out of service";
    } else if (cleanedDuration > resource.category.maxBookingMinutes) {
      state = "TOO_LONG";
      stateReason = `Can be booked for up to ${formatDurationWords(resource.category.maxBookingMinutes)}`;
    } else if (
      cleanedPeople !== undefined &&
      cleanedPeople > 0 &&
      resource.capacity !== null &&
      resource.capacity < cleanedPeople
    ) {
      state = "TOO_SMALL";
      stateReason = `Seats ${resource.capacity}`;
    } else {
      const free = isFree(busyRanges, requestedStartAt, requestedEndAt);
      if (!free) {
        state = "BUSY";
        // Find overlapping reservation for clash range text
        const clash = resReservations.find(
          (r) =>
            requestedStartAt.getTime() < r.endAt.getTime() &&
            requestedEndAt.getTime() > r.startAt.getTime(),
        );
        if (clash) {
          stateReason = `Booked ${formatLabTime(clash.startAt, zone)} to ${formatLabTime(clash.endAt, zone)}`;
        } else {
          stateReason = "Booked during this time";
        }
      } else {
        state = "AVAILABLE";
      }
    }

    // Compute suggestions for BUSY items
    let suggestions: SlotSuggestion[] = [];
    if (state === "BUSY") {
      const availableStartTimes = freeStartTimes({
        busy: busyRanges,
        dayStart,
        dayEnd,
        earliest: earliestTimeForSuggestions,
        durationMinutes: cleanedDuration,
        stepMinutes: SLOT_MINUTES,
      });

      const nearest = nearestStarts(availableStartTimes, requestedStartAt, FIND_SLOT_SUGGESTIONS);

      suggestions = nearest.map((startInstant) => {
        const endInstant = new Date(startInstant.getTime() + cleanedDuration * 60 * 1000);
        const startTimeStr = labTimeString(startInstant, zone);
        const endTimeStr = labTimeString(endInstant, zone);
        const startDateStr = labDateString(startInstant, zone);

        return {
          start: startInstant,
          end: endInstant,
          startTimeStr,
          endTimeStr,
          label: startTimeStr,
          ariaLabel: `Book ${resource.name}, ${startTimeStr} to ${endTimeStr}`,
          href: `/bookings/new?resourceId=${resource.id}&date=${startDateStr}&start=${startTimeStr}&end=${endTimeStr}`,
        };
      });
    }

    const bookHref = `/bookings/new?resourceId=${resource.id}&date=${cleanedDate}&start=${cleanedStart}&end=${labTimeString(requestedEndAt, zone)}`;

    rawItems.push({
      id: resource.id,
      name: resource.name,
      capacity: resource.capacity,
      location: resource.location,
      status: resource.status,
      site: resource.site,
      section: resource.section,
      category: resource.category,
      state,
      stateReason,
      suggestions,
      bookHref,
    });
  }

  // Count available items before freeOnly filter
  const availableCount = rawItems.filter((i) => i.state === "AVAILABLE").length;
  const totalCount = rawItems.length;

  // Sort items:
  // AVAILABLE first, then BUSY with suggestions, then BUSY without, then the rest;
  // inside each group: actor's home site first, then site name, then resource name.
  const getRank = (item: SlotItem): number => {
    if (item.state === "AVAILABLE") return 0;
    if (item.state === "BUSY" && item.suggestions.length > 0) return 1;
    if (item.state === "BUSY") return 2;
    return 3;
  };

  rawItems.sort((a, b) => {
    const rankDiff = getRank(a) - getRank(b);
    if (rankDiff !== 0) return rankDiff;

    const aHome = actor.siteId && a.site.id === actor.siteId ? 0 : 1;
    const bHome = actor.siteId && b.site.id === actor.siteId ? 0 : 1;
    if (aHome !== bHome) return aHome - bHome;

    const siteComp = a.site.name.localeCompare(b.site.name);
    if (siteComp !== 0) return siteComp;

    return a.name.localeCompare(b.name);
  });

  const finalItems = isFreeOnly ? rawItems.filter((i) => i.state === "AVAILABLE") : rawItems;

  return {
    query: {
      date: cleanedDate,
      start: cleanedStart,
      duration: cleanedDuration,
      categoryId: cleanedCategoryId,
      sectionId: cleanedSectionId,
      siteId: cleanedSiteId,
      people: cleanedPeople,
      q: cleanedQ,
      freeOnly: isFreeOnly,
    },
    items: finalItems,
    counts: {
      available: availableCount,
      total: totalCount,
    },
    note: notes.length > 0 ? notes.join(" ") : undefined,
    requestedStartAt,
    requestedEndAt,
  };
}

export interface BookingFilterOptions {
  sites: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; maxBookingMinutes: number; iconKey: string }>;
  sections: Array<{ id: string; name: string }>;
}

/**
 * Loads dropdown master data (sites, categories, sections) for booking search filters.
 */
export async function listBookingFilterOptions(): Promise<BookingFilterOptions> {
  const [sites, categories, sections] = await Promise.all([
    db.site.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({
      select: { id: true, name: true, maxBookingMinutes: true, iconKey: true },
      orderBy: { name: "asc" },
    }),
    db.section.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { sites, categories, sections };
}
