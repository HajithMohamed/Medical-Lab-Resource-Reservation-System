import "server-only";

import { z } from "zod";
import { db } from "@/lib/db";
import {
  canViewEquipmentReports,
  equipmentOverviewSitesFor,
  type UserLike,
} from "@/lib/permissions";
import {
  CALIBRATION_DUE_SOON_DAYS,
  CONDITION_LOOKBACK_DAYS,
  MAINTENANCE_DUE_SOON_DAYS,
  REPORT_DEFAULT_DAYS,
  REPORT_LOG_PAGE_SIZE,
  REPORT_MAX_DAYS,
} from "@/config/rules";
import { addDaysToDay, daysBetween, dbToDay, dayToDb } from "@/lib/equipment-dates";
import { trackerStatus } from "@/lib/equipment-status";
import { equipmentCondition, type EquipmentCondition } from "@/lib/equipment-condition";
import { labToday } from "@/lib/time";
import {
  EquipmentRecordKind,
  EquipmentOutcome,
  ResourceStatus,
  type Prisma,
} from "@/generated/prisma/client";

export const equipmentReportFiltersSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  site: z.string().optional(),
  section: z.string().optional(),
  category: z.string().optional(),
  kind: z.string().optional(),
  outcome: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type EquipmentReportFilters = z.infer<typeof equipmentReportFiltersSchema>;

export interface EquipmentReportFiltersInput {
  from?: string;
  to?: string;
  site?: string;
  section?: string;
  category?: string;
  kind?: string;
  outcome?: string;
  page?: number;
  pageSize?: number;
}

export interface ConditionRow {
  resourceId: string;
  name: string;
  status: ResourceStatus;
  siteId: string;
  siteName: string;
  sectionId: string | null;
  sectionName: string | null;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  condition: EquipmentCondition;
  reasons: string[];
  lastCalibrationDate: string | null;
  lastCalibrationResult: string | null;
  nextCalibrationDue: string | null;
  calibrationDaysRemaining: number | null;
  lastServiceDate: string | null;
  lastServiceResult: string | null;
  nextServiceDue: string | null;
  serviceDaysRemaining: number | null;
  failuresIn12Months: number;
  repairsIn12Months: number;
}

export interface LogRecordRow {
  id: string;
  resourceId: string;
  resourceName: string;
  siteId: string;
  siteName: string;
  sectionName: string | null;
  date: string; // YYYY-MM-DD
  kind: EquipmentRecordKind;
  performedBy: string;
  externalCompany: string | null;
  workPerformed: string | null;
  outcome: EquipmentOutcome;
  nextDueOn: string | null;
  recordedByName: string;
  recordedAt: Date;
  photoCount: number;
}

export interface EquipmentReportData {
  scopeLabel: string;
  siteId: string | "all";
  fromDate: string;
  toDate: string;
  filterSection?: string;
  filterCategory?: string;
  filterKind?: string;
  filterOutcome?: string;

  // Section A: Current equipment condition
  conditionRows: ConditionRow[];
  conditionCounts: {
    poor: number;
    watch: number;
    good: number;
    notTracked: number;
    total: number;
  };

  // Section B: Calibration & service log
  logRows: LogRecordRow[];
  logTotalCount: number;
  logTotalPages: number;
  logCurrentPage: number;
  logPageSize: number;
  logCounts: {
    total: number;
    pass: number;
    fail: number;
    notDone: number;
  };
}

export type EquipmentReportResult =
  { ok: true; data: EquipmentReportData } | { ok: false; error: string };

const CONDITION_SORT_ORDER: Record<EquipmentCondition, number> = {
  POOR: 0,
  WATCH: 1,
  GOOD: 2,
  NOT_TRACKED: 3,
};

export async function getEquipmentReport(
  actor: UserLike,
  options: EquipmentReportFiltersInput = {},
): Promise<EquipmentReportResult> {
  if (!canViewEquipmentReports(actor)) {
    return {
      ok: false,
      error: "You do not have permission to view equipment reports.",
    };
  }

  const allowedSites = equipmentOverviewSitesFor(actor);
  if (allowedSites.length === 0) {
    return { ok: false, error: "No site access available." };
  }

  // Scoping: Manager is strictly locked to own site, admin can pick or see all
  let scopedSiteId: string | "all" = "all";
  if (Array.isArray(allowedSites)) {
    scopedSiteId = allowedSites[0];
  } else if (options.site && options.site !== "all") {
    scopedSiteId = options.site;
  }

  const today = labToday();
  const toDate = options.to && /^\d{4}-\d{2}-\d{2}$/.test(options.to) ? options.to : today;
  let fromDate =
    options.from && /^\d{4}-\d{2}-\d{2}$/.test(options.from)
      ? options.from
      : addDaysToDay(toDate, -REPORT_DEFAULT_DAYS);

  if (fromDate > toDate) {
    fromDate = toDate;
  }
  if (daysBetween(fromDate, toDate) > REPORT_MAX_DAYS) {
    fromDate = addDaysToDay(toDate, -REPORT_MAX_DAYS);
  }

  const siteWhere: Prisma.ResourceWhereInput["siteId"] =
    scopedSiteId === "all" ? undefined : scopedSiteId;

  // Resolve scope label
  let scopeLabel = "All sites";
  if (scopedSiteId !== "all") {
    const siteObj = await db.site.findUnique({
      where: { id: scopedSiteId },
      select: { name: true },
    });
    scopeLabel = siteObj ? siteObj.name : "Selected site";
  }

  // Common filters for resources: all non-retired resources in site scope
  const resourceFilter: Prisma.ResourceWhereInput = {
    status: { not: ResourceStatus.RETIRED },
    ...(siteWhere ? { siteId: siteWhere } : {}),
    ...(options.section ? { sectionId: options.section } : {}),
    ...(options.category ? { categoryId: options.category } : {}),
  };

  // Section A: All resources with their records
  const lookbackCutoff = dayToDb(addDaysToDay(today, -CONDITION_LOOKBACK_DAYS));

  const allResources = await db.resource.findMany({
    where: resourceFilter,
    include: {
      site: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, iconKey: true } },
      equipmentRecords: {
        orderBy: [{ performedOn: "desc" }, { createdAt: "desc" }],
        select: {
          kind: true,
          outcome: true,
          performedOn: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const conditionCounts = { poor: 0, watch: 0, good: 0, notTracked: 0, total: 0 };
  const conditionRows: ConditionRow[] = [];

  for (const r of allResources) {
    const nextCalDay = r.nextCalibrationDueOn ? dbToDay(r.nextCalibrationDueOn) : null;
    const nextMaintDay = r.nextMaintenanceDueOn ? dbToDay(r.nextMaintenanceDueOn) : null;
    const inServiceDay = r.inServiceOn ? dbToDay(r.inServiceOn) : null;

    const calStatus = trackerStatus({
      dueOn: nextCalDay,
      today,
      dueSoonDays: CALIBRATION_DUE_SOON_DAYS,
    });
    const maintStatus = trackerStatus({
      dueOn: nextMaintDay,
      today,
      dueSoonDays: MAINTENANCE_DUE_SOON_DAYS,
    });

    // Recent records in lookback
    const recentRecords = r.equipmentRecords.filter((rec) => rec.performedOn >= lookbackCutoff);
    const checkRecords = recentRecords.filter((rec) =>
      ["CALIBRATION", "PERFORMANCE_CHECK", "REPAIR"].includes(rec.kind),
    );
    const latestCheck = checkRecords[0];

    const failuresIn12Months = recentRecords.filter((rec) => rec.outcome === "FAIL").length;
    const repairsIn12Months = recentRecords.filter((rec) => rec.kind === "REPAIR").length;

    const hasSchedules =
      r.calibrationIntervalDays != null ||
      r.maintenanceIntervalDays != null ||
      r.nextCalibrationDueOn != null ||
      r.nextMaintenanceDueOn != null;

    const cond = equipmentCondition({
      resourceStatus: r.status,
      calibrationTrackerStatus: calStatus,
      maintenanceTrackerStatus: maintStatus,
      latestCheckOutcome: latestCheck?.outcome ?? null,
      failuresInLookback: failuresIn12Months,
      repairsInLookback: repairsIn12Months,
      inServiceOn: inServiceDay,
      expectedServiceLifeYears: r.expectedServiceLifeYears,
      today,
      nextCalibrationDueOn: nextCalDay,
      nextMaintenanceDueOn: nextMaintDay,
      hasSchedules,
      hasRecords: r.equipmentRecords.length > 0,
    });

    if (cond.condition === "POOR") conditionCounts.poor++;
    else if (cond.condition === "WATCH") conditionCounts.watch++;
    else if (cond.condition === "GOOD") conditionCounts.good++;
    else conditionCounts.notTracked++;
    conditionCounts.total++;

    // Latest calibration & service records
    const latestCal = r.equipmentRecords.find((rec) => rec.kind === "CALIBRATION");
    const latestMaint = r.equipmentRecords.find((rec) => rec.kind === "PREVENTIVE_MAINTENANCE");

    const calDaysRemaining = nextCalDay ? daysBetween(today, nextCalDay) : null;
    const serviceDaysRemaining = nextMaintDay ? daysBetween(today, nextMaintDay) : null;

    conditionRows.push({
      resourceId: r.id,
      name: r.name,
      status: r.status,
      siteId: r.site.id,
      siteName: r.site.name,
      sectionId: r.section?.id ?? null,
      sectionName: r.section?.name ?? null,
      categoryId: r.category.id,
      categoryName: r.category.name,
      categoryIcon: r.category.iconKey,
      condition: cond.condition,
      reasons: cond.reasons,
      lastCalibrationDate: latestCal ? dbToDay(latestCal.performedOn) : null,
      lastCalibrationResult: latestCal ? latestCal.outcome : null,
      nextCalibrationDue: nextCalDay,
      calibrationDaysRemaining: calDaysRemaining,
      lastServiceDate: latestMaint ? dbToDay(latestMaint.performedOn) : null,
      lastServiceResult: latestMaint ? latestMaint.outcome : null,
      nextServiceDue: nextMaintDay,
      serviceDaysRemaining,
      failuresIn12Months,
      repairsIn12Months,
    });
  }

  // Sort: POOR -> WATCH -> GOOD -> NOT_TRACKED, then name
  conditionRows.sort((a, b) => {
    const diff = CONDITION_SORT_ORDER[a.condition] - CONDITION_SORT_ORDER[b.condition];
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  // Section B: Calibration & service log
  const logWhere: Prisma.EquipmentRecordWhereInput = {
    performedOn: {
      gte: dayToDb(fromDate),
      lte: dayToDb(toDate),
    },
    resource: {
      ...(siteWhere ? { siteId: siteWhere } : {}),
      ...(options.section ? { sectionId: options.section } : {}),
      ...(options.category ? { categoryId: options.category } : {}),
    },
    ...(options.kind ? { kind: options.kind as EquipmentRecordKind } : {}),
    ...(options.outcome ? { outcome: options.outcome as EquipmentOutcome } : {}),
  };

  const [totalLogRecords, passCount, failCount, notDoneCount] = await Promise.all([
    db.equipmentRecord.count({ where: logWhere }),
    db.equipmentRecord.count({
      where: { ...logWhere, outcome: EquipmentOutcome.PASS },
    }),
    db.equipmentRecord.count({
      where: { ...logWhere, outcome: EquipmentOutcome.FAIL },
    }),
    db.equipmentRecord.count({
      where: { ...logWhere, outcome: EquipmentOutcome.NOT_DONE },
    }),
  ]);

  const currentPage = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? REPORT_LOG_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(totalLogRecords / pageSize));
  const skip = (currentPage - 1) * pageSize;

  const rawLogRecords = await db.equipmentRecord.findMany({
    where: logWhere,
    include: {
      resource: {
        select: {
          id: true,
          name: true,
          site: { select: { id: true, name: true } },
          section: { select: { name: true } },
        },
      },
      recordedBy: { select: { name: true } },
    },
    orderBy: [{ performedOn: "desc" }, { createdAt: "desc" }],
    skip,
    take: pageSize,
  });

  const logRows: LogRecordRow[] = rawLogRecords.map((rec) => ({
    id: rec.id,
    resourceId: rec.resource.id,
    resourceName: rec.resource.name,
    siteId: rec.resource.site.id,
    siteName: rec.resource.site.name,
    sectionName: rec.resource.section?.name ?? null,
    date: dbToDay(rec.performedOn),
    kind: rec.kind,
    performedBy: rec.performedBy,
    externalCompany: rec.externalCompany,
    workPerformed: rec.workPerformed,
    outcome: rec.outcome,
    nextDueOn: rec.nextDueOn ? dbToDay(rec.nextDueOn) : null,
    recordedByName: rec.recordedBy.name,
    recordedAt: rec.createdAt,
    photoCount: 0,
  }));

  return {
    ok: true,
    data: {
      scopeLabel,
      siteId: scopedSiteId,
      fromDate,
      toDate,
      filterSection: options.section,
      filterCategory: options.category,
      filterKind: options.kind,
      filterOutcome: options.outcome,
      conditionRows,
      conditionCounts,
      logRows,
      logTotalCount: totalLogRecords,
      logTotalPages: totalPages,
      logCurrentPage: currentPage,
      logPageSize: pageSize,
      logCounts: {
        total: totalLogRecords,
        pass: passCount,
        fail: failCount,
        notDone: notDoneCount,
      },
    },
  };
}
