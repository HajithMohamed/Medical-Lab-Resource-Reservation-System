import "server-only";

import { TZDate } from "@date-fns/tz";
import { startOfWeek } from "date-fns";
import { db } from "@/lib/db";
import {
  labDayStart,
  addLabDays,
  getLabTimeZone,
  labDateString,
  labToday,
  formatTimeRange,
} from "@/lib/time";
import { ResourceStatus, ReservationStatus, type ReservationKind } from "@/generated/prisma/client";

export interface CalendarReservation {
  id: string;
  resourceId: string;
  kind: ReservationKind;
  purpose: string;
  startAt: Date;
  endAt: Date;
  timeRange: string;
  durationMinutes: number;
  createdBy: {
    name: string;
  };
  isMine: boolean;
}

export interface CalendarResource {
  id: string;
  name: string;
  status: ResourceStatus;
  location: string | null;
  capacity: number | null;
  category: {
    id: string;
    name: string;
    iconKey: string;
  };
  section: {
    id: string;
    name: string;
  };
  site: {
    id: string;
    name: string;
  };
}

export interface SiteDayResult {
  site: {
    id: string;
    name: string;
  } | null;
  dayStart: Date;
  dayEnd: Date;
  dateString: string;
  nowMs: number;
  resources: CalendarResource[];
  reservations: CalendarReservation[];
}

export interface WeekDayInfo {
  dateString: string;
  dayStart: Date;
  dayEnd: Date;
  isToday: boolean;
}

export interface ResourceWeekResult {
  resource: CalendarResource | null;
  weekStart: Date;
  weekEnd: Date;
  mondayDateString: string;
  nowMs: number;
  days: WeekDayInfo[];
  reservations: CalendarReservation[];
}

export interface CalendarOptionsData {
  sites: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  resources: Array<{
    id: string;
    name: string;
    status: ResourceStatus;
    siteId: string;
    categoryId: string;
  }>;
}

/**
 * Loads a site's day view:
 * - ACTIVE and OUT_OF_SERVICE resources (not RETIRED), ordered by category and name.
 * - CONFIRMED reservations that overlap that lab day [dayStart, dayEnd).
 * - Flags viewer's own bookings with isMine.
 */
export async function getSiteDay(
  viewerId: string,
  siteId: string,
  dateString: string,
  categoryId?: string,
): Promise<SiteDayResult> {
  const zone = getLabTimeZone();
  const dayStart = labDayStart(dateString, zone);
  const dayEnd = labDayStart(addLabDays(dateString, 1, zone), zone);

  const [site, resources] = await Promise.all([
    db.site.findUnique({
      where: { id: siteId },
      select: { id: true, name: true },
    }),
    db.resource.findMany({
      where: {
        siteId,
        status: { in: [ResourceStatus.ACTIVE, ResourceStatus.OUT_OF_SERVICE] },
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        category: { select: { id: true, name: true, iconKey: true } },
        section: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
      },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  const resourceIds = resources.map((r) => r.id);

  const rawReservations =
    resourceIds.length === 0
      ? []
      : await db.reservation.findMany({
          where: {
            resourceId: { in: resourceIds },
            status: ReservationStatus.CONFIRMED,
            startAt: { lt: dayEnd },
            endAt: { gt: dayStart },
          },
          select: {
            id: true,
            resourceId: true,
            kind: true,
            purpose: true,
            startAt: true,
            endAt: true,
            createdById: true,
            createdBy: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { startAt: "asc" },
        });

  const reservations: CalendarReservation[] = rawReservations.map((r) => ({
    id: r.id,
    resourceId: r.resourceId,
    kind: r.kind,
    purpose: r.purpose,
    startAt: r.startAt,
    endAt: r.endAt,
    timeRange: formatTimeRange(r.startAt, r.endAt, zone),
    durationMinutes: Math.round((r.endAt.getTime() - r.startAt.getTime()) / (60 * 1000)),
    createdBy: {
      name: r.createdBy.name,
    },
    isMine: r.createdById === viewerId,
  }));

  return {
    site,
    dayStart,
    dayEnd,
    dateString,
    nowMs: Date.now(),
    resources,
    reservations,
  };
}

/**
 * Loads a single resource's week view (Monday to Sunday containing dateString):
 * - CONFIRMED reservations overlapping [weekStart, weekEnd).
 * - Leaves out RETIRED resources (returns null resource).
 */
export async function getResourceWeek(
  viewerId: string,
  resourceId: string,
  dateString: string,
): Promise<ResourceWeekResult> {
  const zone = getLabTimeZone();
  const currentDayStart = labDayStart(dateString, zone);

  // Find Monday of the week in lab zone
  const mondayTz = startOfWeek(new TZDate(currentDayStart, zone), { weekStartsOn: 1 });
  const mondayDateString = labDateString(mondayTz, zone);

  const weekStart = labDayStart(mondayDateString, zone);
  const weekEnd = labDayStart(addLabDays(mondayDateString, 7, zone), zone);
  const todayStr = labToday(zone);

  const days: WeekDayInfo[] = Array.from({ length: 7 }, (_, i) => {
    const dayDateString = addLabDays(mondayDateString, i, zone);
    const dayStart = labDayStart(dayDateString, zone);
    const dayEnd = labDayStart(addLabDays(dayDateString, 1, zone), zone);
    return {
      dateString: dayDateString,
      dayStart,
      dayEnd,
      isToday: dayDateString === todayStr,
    };
  });

  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    include: {
      category: { select: { id: true, name: true, iconKey: true } },
      section: { select: { id: true, name: true } },
      site: { select: { id: true, name: true } },
    },
  });

  // RETIRED resources are left out
  if (!resource || resource.status === ResourceStatus.RETIRED) {
    return {
      resource: null,
      weekStart,
      weekEnd,
      mondayDateString,
      nowMs: Date.now(),
      days,
      reservations: [],
    };
  }

  const rawReservations = await db.reservation.findMany({
    where: {
      resourceId: resource.id,
      status: ReservationStatus.CONFIRMED,
      startAt: { lt: weekEnd },
      endAt: { gt: weekStart },
    },
    select: {
      id: true,
      resourceId: true,
      kind: true,
      purpose: true,
      startAt: true,
      endAt: true,
      createdById: true,
      createdBy: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { startAt: "asc" },
  });

  const reservations: CalendarReservation[] = rawReservations.map((r) => ({
    id: r.id,
    resourceId: r.resourceId,
    kind: r.kind,
    purpose: r.purpose,
    startAt: r.startAt,
    endAt: r.endAt,
    timeRange: formatTimeRange(r.startAt, r.endAt, zone),
    durationMinutes: Math.round((r.endAt.getTime() - r.startAt.getTime()) / (60 * 1000)),
    createdBy: {
      name: r.createdBy.name,
    },
    isMine: r.createdById === viewerId,
  }));

  return {
    resource,
    weekStart,
    weekEnd,
    mondayDateString,
    nowMs: Date.now(),
    days,
    reservations,
  };
}

/**
 * Loads options for calendar page selects (sites, categories, and resources of a site).
 * Move any direct db use out of the page.
 */
export async function listCalendarOptions(siteId?: string): Promise<CalendarOptionsData> {
  const [sites, categories, resources] = await Promise.all([
    db.site.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.resource.findMany({
      where: {
        ...(siteId ? { siteId } : {}),
        status: { in: [ResourceStatus.ACTIVE, ResourceStatus.OUT_OF_SERVICE] },
      },
      select: {
        id: true,
        name: true,
        status: true,
        siteId: true,
        categoryId: true,
      },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  return { sites, categories, resources };
}
