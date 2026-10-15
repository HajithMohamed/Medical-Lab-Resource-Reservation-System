import "server-only";

import { TZDate } from "@date-fns/tz";
import { format, subDays } from "date-fns";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { canViewUsage, usageSitesFor, type UserLike } from "@/lib/permissions";
import { USAGE_DEFAULT_DAYS, USAGE_MAX_DAYS } from "@/config/rules";
import {
  standardWindows,
  standardMinutes,
  overlapMinutes,
  utilisationPercent,
  minutesByHourOfDay,
  minutesBySection,
  classify,
  type SectionUsage,
} from "@/lib/usage";
import { labDateString, parseLabDateTime } from "@/lib/time";
import { ReservationKind, ReservationStatus } from "@/generated/prisma/client";

export type { SectionUsage };

export interface ResourceUsageItem {
  id: string;
  name: string;
  categoryName: string;
  iconKey: string;
  siteId: string;
  siteName: string;
  bookedHoursTotal: number;
  bookedHoursStandard: number;
  totalBookedMinutes: number;
  standardBookedMinutes: number;
  standardAvailableMinutes: number;
  utilisation: number;
  classification: "busy" | "idle" | "normal";
}

export interface PeakHoursData {
  hourlyMinutes: number[];
  busiestHourIndex: number;
  busiestHourLabel: string;
  busiestHourMinutes: number;
}

export interface UsageReportData {
  scopeLabel: string;
  siteId: string | "all";
  fromDate: string;
  toDate: string;
  fromFormatted: string;
  toFormatted: string;
  rangeFormatted: string;
  daysCount: number;
  standardHoursAvailablePerResource: number;

  resources: ResourceUsageItem[];

  totals: {
    totalBookedHours: number;
    averageUtilisation: number;
    totalMaintenanceHours: number;
    cancelledBookingsCount: number;
  };

  peakHours: PeakHoursData;
  sections: SectionUsage[];
}

export type GetUsageResult =
  | {
      ok: true;
      data: UsageReportData;
    }
  | {
      ok: false;
      error: string;
    };

export interface GetUsageOptions {
  from?: Date | string;
  to?: Date | string;
  siteId?: string;
  zone?: string;
  now?: Date;
}

/**
 * Resolves standard default report date strings [fromStr, toStr]
 * Default: the last USAGE_DEFAULT_DAYS full days ending yesterday.
 */
export function getDefaultUsageDateStrings(
  zone: string = env.APP_TIME_ZONE,
  now: Date = new Date(),
): {
  fromStr: string;
  toStr: string;
} {
  const yesterday = subDays(new TZDate(now, zone), 1);
  const toStr = format(yesterday, "yyyy-MM-dd");
  const startDate = subDays(yesterday, USAGE_DEFAULT_DAYS - 1);
  const fromStr = format(startDate, "yyyy-MM-dd");
  return { fromStr, toStr };
}

/**
 * Retrieves the comprehensive usage report for the given actor, period and site.
 * Strictly enforces site scoping:
 * - MANAGER: always scoped to their own site (any other siteId in options is ignored).
 * - ADMIN: can view specific site or "all" sites.
 * - STAFF: rejected.
 */
export async function getUsage(
  actor: UserLike,
  options: GetUsageOptions = {},
): Promise<GetUsageResult> {
  const zone = options.zone ?? env.APP_TIME_ZONE;
  const now = options.now ?? new Date();

  // Scope first: sites = usageSitesFor(actor)
  const allowedSites = usageSitesFor(actor);
  if (allowedSites.length === 0) {
    return { ok: false, error: "You do not have access to usage reports." };
  }

  // 1. Determine site scope
  let scopedSiteId: string | "all" = "all";
  if (Array.isArray(allowedSites)) {
    // For a MANAGER the scope is always [own site] whatever options.siteId says
    scopedSiteId = allowedSites[0];
  } else if (options.siteId && options.siteId !== "all") {
    scopedSiteId = options.siteId;
  } else {
    scopedSiteId = "all";
  }

  // Double check authorization
  if (!canViewUsage(actor, scopedSiteId)) {
    return { ok: false, error: "You do not have permission to view usage for this site." };
  }

  // 2. Resolve dates [fromDate, toDate)
  const defaultDates = getDefaultUsageDateStrings(zone, now);
  let fromDateStr =
    typeof options.from === "string" && options.from ? options.from : defaultDates.fromStr;
  let toDateStr = typeof options.to === "string" && options.to ? options.to : defaultDates.toStr;

  if (options.from instanceof Date) {
    fromDateStr = labDateString(options.from, zone);
  }
  if (options.to instanceof Date) {
    toDateStr = labDateString(options.to, zone);
  }

  const from = parseLabDateTime(fromDateStr, "00:00", zone);
  // Upper bound is exclusive: start of the day after toDateStr
  const toDayDate = parseLabDateTime(toDateStr, "00:00", zone);
  const to = new TZDate(toDayDate, zone);
  to.setDate(to.getDate() + 1);

  if (to <= from) {
    return { ok: false, error: "Start date must be before end date." };
  }

  const daysCount = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  if (daysCount > USAGE_MAX_DAYS) {
    return { ok: false, error: `Report period cannot exceed ${USAGE_MAX_DAYS} days.` };
  }

  // 3. Resolve Scope Label
  let scopeLabel = "All sites";
  if (scopedSiteId !== "all") {
    const site = await db.site.findUnique({
      where: { id: scopedSiteId },
      select: { name: true },
    });
    scopeLabel = site?.name ?? "Site Laboratory";
  }

  // 4. Calculate Standard Windows
  const windows = standardWindows(from, to, zone);
  const standardAvailableMins = standardMinutes(windows);
  const standardHoursAvailablePerResource = Math.round((standardAvailableMins / 60) * 10) / 10;

  // 5. Database Queries
  const siteFilter = scopedSiteId === "all" ? {} : { siteId: scopedSiteId };

  // A. Load resources in scope (active & out of service, excluding retired)
  const resources = await db.resource.findMany({
    where: {
      ...siteFilter,
      status: { not: "RETIRED" },
    },
    select: {
      id: true,
      name: true,
      siteId: true,
      category: {
        select: {
          name: true,
          iconKey: true,
        },
      },
      site: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ name: "asc" }],
  });

  // B. Load confirmed reservations in period [from, to)
  const confirmedReservations = await db.reservation.findMany({
    where: {
      status: ReservationStatus.CONFIRMED,
      startAt: { lt: to },
      endAt: { gt: from },
      resource: {
        ...siteFilter,
        status: { not: "RETIRED" },
      },
    },
    select: {
      id: true,
      resourceId: true,
      kind: true,
      startAt: true,
      endAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          section: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  // C. Load cancelled booking reservations in period
  const cancelledBookings = await db.reservation.findMany({
    where: {
      status: ReservationStatus.CANCELLED,
      kind: ReservationKind.BOOKING,
      cancelledAt: {
        gte: from,
        lt: to,
      },
      resource: {
        ...siteFilter,
        status: { not: "RETIRED" },
      },
    },
    select: {
      id: true,
      cancelReason: true,
    },
  });

  // 6. Aggregate per resource
  const confirmedBookings = confirmedReservations.filter((r) => r.kind === ReservationKind.BOOKING);
  const confirmedMaintenance = confirmedReservations.filter(
    (r) => r.kind === ReservationKind.MAINTENANCE,
  );

  // Group confirmed bookings by resource ID
  const bookingsByResource = new Map<string, Array<{ startAt: Date; endAt: Date }>>();
  for (const b of confirmedBookings) {
    const list = bookingsByResource.get(b.resourceId) ?? [];
    list.push({ startAt: b.startAt, endAt: b.endAt });
    bookingsByResource.set(b.resourceId, list);
  }

  const resourceItems: ResourceUsageItem[] = resources.map((r) => {
    const rBookings = bookingsByResource.get(r.id) ?? [];

    let totalMins = 0;
    let standardMins = 0;

    for (const b of rBookings) {
      // Clip to report period [from, to)
      totalMins += overlapMinutes(b.startAt, b.endAt, from, to);

      // Clip against standard windows
      for (const w of windows) {
        standardMins += overlapMinutes(b.startAt, b.endAt, w.start, w.end);
      }
    }

    const utilisation = utilisationPercent(standardMins, standardAvailableMins);
    const classification = classify(utilisation);

    return {
      id: r.id,
      name: r.name,
      categoryName: r.category.name,
      iconKey: r.category.iconKey,
      siteId: r.siteId,
      siteName: r.site.name,
      bookedHoursTotal: Math.round((totalMins / 60) * 10) / 10,
      bookedHoursStandard: Math.round((standardMins / 60) * 10) / 10,
      totalBookedMinutes: totalMins,
      standardBookedMinutes: standardMins,
      standardAvailableMinutes: standardAvailableMins,
      utilisation,
      classification,
    };
  });

  // Sort resources by utilisation descending, then name ascending
  resourceItems.sort((a, b) => b.utilisation - a.utilisation || a.name.localeCompare(b.name));

  // 7. Calculate Totals
  const totalBookedMinutes = resourceItems.reduce((acc, r) => acc + r.totalBookedMinutes, 0);
  const totalBookedHours = Math.round((totalBookedMinutes / 60) * 10) / 10;

  // Average utilisation across resources
  const averageUtilisation =
    resourceItems.length > 0
      ? Math.round(
          (resourceItems.reduce((acc, r) => acc + r.utilisation, 0) / resourceItems.length) * 10,
        ) / 10
      : 0;

  // Total maintenance hours
  let totalMaintenanceMinutes = 0;
  for (const m of confirmedMaintenance) {
    totalMaintenanceMinutes += overlapMinutes(m.startAt, m.endAt, from, to);
  }
  const totalMaintenanceHours = Math.round((totalMaintenanceMinutes / 60) * 10) / 10;

  // 8. Peak Hours Calculation
  const hourlyMinutes = minutesByHourOfDay(confirmedBookings, from, to, zone);
  let busiestHourIdx = 0;
  let maxHourlyMins = 0;
  for (let h = 0; h < 24; h++) {
    if (hourlyMinutes[h] > maxHourlyMins) {
      maxHourlyMins = hourlyMinutes[h];
      busiestHourIdx = h;
    }
  }

  const startHStr = String(busiestHourIdx).padStart(2, "0");
  const endHStr = String((busiestHourIdx + 1) % 24).padStart(2, "0");
  const busiestHourLabel = `${startHStr}:00 to ${endHStr}:00`;

  // 9. Use by Section
  const sections = minutesBySection(confirmedBookings);

  // Formatted date labels
  const fromFormatted = format(new TZDate(from, zone), "d MMMM yyyy");
  const toFormatted = format(new TZDate(toDayDate, zone), "d MMMM yyyy");
  const rangeFormatted = `${format(new TZDate(from, zone), "d MMMM")} to ${format(new TZDate(toDayDate, zone), "d MMMM yyyy")}`;

  return {
    ok: true,
    data: {
      scopeLabel,
      siteId: scopedSiteId,
      fromDate: fromDateStr,
      toDate: toDateStr,
      fromFormatted,
      toFormatted,
      rangeFormatted,
      daysCount,
      standardHoursAvailablePerResource,
      resources: resourceItems,
      totals: {
        totalBookedHours,
        averageUtilisation,
        totalMaintenanceHours,
        cancelledBookingsCount: cancelledBookings.length,
      },
      peakHours: {
        hourlyMinutes,
        busiestHourIndex: busiestHourIdx,
        busiestHourLabel,
        busiestHourMinutes: maxHourlyMins,
      },
      sections,
    },
  };
}
