import "server-only";

import { z } from "zod";
import { db } from "@/lib/db";
import {
  canManageEquipment,
  canViewEquipmentOverview,
  equipmentOverviewSitesFor,
  type UserLike,
} from "@/lib/permissions";
import {
  EquipmentRecordKind,
  EquipmentOutcome,
  ResourceStatus,
  ReservationKind,
  ReservationStatus,
} from "@/generated/prisma/client";
import {
  CALIBRATION_DUE_SOON_DAYS,
  MAINTENANCE_DUE_SOON_DAYS,
  REPLACEMENT_REVIEW_LEAD_DAYS,
  REPLACEMENT_REVIEW_REPAIRS,
  REPLACEMENT_REVIEW_REPAIR_DAYS,
  EQUIPMENT_HISTORY_ROWS,
} from "@/config/rules";
import { isValidDay, dayToDb, dbToDay, addDaysToDay, daysBetween } from "@/lib/equipment-dates";
import { labToday, endOfLabDay } from "@/lib/time";
import { trackerStatus, formatEquipmentDay, type TrackerStatus } from "@/lib/equipment-status";
import { takeResourceOutOfServiceInTx } from "@/services/resources";

export type ServiceResult<T = void> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export interface EquipmentRecordItem {
  id: string;
  resourceId: string;
  kind: EquipmentRecordKind;
  outcome: EquipmentOutcome;
  performedOn: Date;
  performedBy: string;
  reference: string | null;
  notes: string | null;
  workPerformed: string | null;
  externalCompany: string | null;
  nextDueOn: Date | null;
  recordedById: string;
  createdAt: Date;
  recordedBy: {
    id: string;
    name: string;
  };
}

export const equipmentRecordInputSchema = z
  .object({
    kind: z.nativeEnum(EquipmentRecordKind),
    outcome: z.nativeEnum(EquipmentOutcome),
    performedOn: z.string().trim().refine(isValidDay, "Date must be a valid date (YYYY-MM-DD)."),
    performedBy: z
      .string()
      .trim()
      .min(1, "Enter who performed the work.")
      .max(120, "Performed by cannot exceed 120 characters."),
    reference: z
      .string()
      .trim()
      .max(120, "Reference cannot exceed 120 characters.")
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    notes: z
      .string()
      .trim()
      .max(500, "Notes cannot exceed 500 characters.")
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    workPerformed: z
      .string()
      .trim()
      .max(1000, "Work performed cannot exceed 1000 characters.")
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    externalCompany: z
      .string()
      .trim()
      .max(120, "Company cannot exceed 120 characters.")
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    nextDueOn: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
  })
  .superRefine((data, ctx) => {
    const today = labToday();

    if (data.performedOn > today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Date performed cannot be in the future.",
        path: ["performedOn"],
      });
    }

    if (data.nextDueOn) {
      if (!isValidDay(data.nextDueOn)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Next due date must be a valid date (YYYY-MM-DD).",
          path: ["nextDueOn"],
        });
      } else if (data.nextDueOn <= data.performedOn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Next due date must be after the date performed.",
          path: ["nextDueOn"],
        });
      }
    }

    // Outcome fits kind
    if (data.kind === EquipmentRecordKind.REPLACEMENT_REVIEW) {
      if (
        data.outcome !== EquipmentOutcome.KEEP_IN_SERVICE &&
        data.outcome !== EquipmentOutcome.REPLACE
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Replacement review outcome must be Keep in service or Replace.",
          path: ["outcome"],
        });
      }
      if (!data.nextDueOn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter the review date.",
          path: ["nextDueOn"],
        });
      }
    } else if (
      data.kind === EquipmentRecordKind.CALIBRATION ||
      data.kind === EquipmentRecordKind.PREVENTIVE_MAINTENANCE
    ) {
      if (
        data.outcome !== EquipmentOutcome.PASS &&
        data.outcome !== EquipmentOutcome.FAIL &&
        data.outcome !== EquipmentOutcome.NOT_DONE
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Outcome must be Pass, Fail, or Not done.",
          path: ["outcome"],
        });
      }
    } else {
      // PERFORMANCE_CHECK or REPAIR
      if (data.outcome !== EquipmentOutcome.PASS && data.outcome !== EquipmentOutcome.FAIL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Outcome must be Pass or Fail.",
          path: ["outcome"],
        });
      }
    }

    // Notes required for FAIL, REPLACE, NOT_DONE
    if (
      data.outcome === EquipmentOutcome.FAIL ||
      data.outcome === EquipmentOutcome.REPLACE ||
      data.outcome === EquipmentOutcome.NOT_DONE
    ) {
      if (!data.notes || data.notes.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Notes are required explaining the result or reason.",
          path: ["notes"],
        });
      }
    }

    // Work performed required for PASS and FAIL outcomes on service/calibration/repair/check
    const doneKinds: EquipmentRecordKind[] = [
      EquipmentRecordKind.CALIBRATION,
      EquipmentRecordKind.PREVENTIVE_MAINTENANCE,
      EquipmentRecordKind.REPAIR,
      EquipmentRecordKind.PERFORMANCE_CHECK,
    ];
    if (
      (data.outcome === EquipmentOutcome.PASS || data.outcome === EquipmentOutcome.FAIL) &&
      doneKinds.includes(data.kind)
    ) {
      if (!data.workPerformed || data.workPerformed.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Describe the work done or changes made.",
          path: ["workPerformed"],
        });
      }
    }
  });

export type EquipmentRecordInput = z.infer<typeof equipmentRecordInputSchema>;

/**
 * Loads the equipment history for a resource, newest first.
 * Open to everyone (STAFF, MANAGER, ADMIN).
 */
export async function getEquipmentHistory(
  resourceId: string,
  limit: number = EQUIPMENT_HISTORY_ROWS,
): Promise<ServiceResult<EquipmentRecordItem[]>> {
  const records = await db.equipmentRecord.findMany({
    where: { resourceId },
    orderBy: [{ performedOn: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      recordedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return { ok: true, data: records };
}

/**
 * Records a new equipment verification, maintenance, repair or review result.
 * Enforces permissions, append-only invariants, and automatically takes active
 * resources out of service upon failure.
 */
export async function addEquipmentRecord(
  actor: UserLike & { id: string },
  resourceId: string,
  rawInput: unknown,
): Promise<ServiceResult<{ record: EquipmentRecordItem; cancelledBookingsCount?: number }>> {
  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    include: {
      equipmentRecords: {
        where: {
          kind: {
            in: [
              EquipmentRecordKind.CALIBRATION,
              EquipmentRecordKind.PERFORMANCE_CHECK,
              EquipmentRecordKind.REPAIR,
            ],
          },
        },
        orderBy: [{ performedOn: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { outcome: true },
      },
    },
  });

  if (!resource) {
    return { ok: false, error: "Resource not found." };
  }

  if (!canManageEquipment(actor, resource)) {
    return {
      ok: false,
      error: "You do not have permission to record equipment care for this resource.",
    };
  }

  if (resource.status === ResourceStatus.RETIRED) {
    return {
      ok: false,
      error: "This resource is retired. Its history is kept, but new records cannot be added.",
    };
  }

  const parsed = equipmentRecordInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid record data.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data;
  const today = labToday();

  // Next due requirement on PASS for schedules
  if (input.outcome === EquipmentOutcome.PASS) {
    if (input.kind === EquipmentRecordKind.CALIBRATION && resource.calibrationIntervalDays) {
      if (!input.nextDueOn) {
        return {
          ok: false,
          error: "Enter the next calibration due date.",
          fieldErrors: { nextDueOn: ["Enter the next calibration due date."] },
        };
      }
    }
    if (
      input.kind === EquipmentRecordKind.PREVENTIVE_MAINTENANCE &&
      resource.maintenanceIntervalDays
    ) {
      if (!input.nextDueOn) {
        return {
          ok: false,
          error: "Enter the next service due date.",
          fieldErrors: { nextDueOn: ["Enter the next service due date."] },
        };
      }
    }
  }

  // NOT_DONE checks
  if (input.outcome === EquipmentOutcome.NOT_DONE) {
    if (
      input.kind !== EquipmentRecordKind.CALIBRATION &&
      input.kind !== EquipmentRecordKind.PREVENTIVE_MAINTENANCE
    ) {
      return {
        ok: false,
        error: "Not done is only supported for calibration or preventive maintenance.",
      };
    }

    const currentDueOn =
      input.kind === EquipmentRecordKind.CALIBRATION
        ? resource.nextCalibrationDueOn
          ? dbToDay(resource.nextCalibrationDueOn)
          : null
        : resource.nextMaintenanceDueOn
          ? dbToDay(resource.nextMaintenanceDueOn)
          : null;

    const currentTrackerStatus = trackerStatus({
      dueOn: currentDueOn,
      today,
      dueSoonDays:
        input.kind === EquipmentRecordKind.CALIBRATION
          ? CALIBRATION_DUE_SOON_DAYS
          : MAINTENANCE_DUE_SOON_DAYS,
    });

    if (currentTrackerStatus !== "DUE_TODAY" && currentTrackerStatus !== "OVERDUE") {
      return {
        ok: false,
        error: "Marking as not done is only allowed on or after the scheduled due date.",
      };
    }
  }

  let cancelledCount = 0;
  let resultMessage = "Result recorded.";

  const record = await db.$transaction(async (tx) => {
    // 1. Insert the equipment record
    const createdRecord = await tx.equipmentRecord.create({
      data: {
        resourceId,
        kind: input.kind,
        outcome: input.outcome,
        performedOn: dayToDb(input.performedOn),
        performedBy: input.performedBy,
        reference: input.reference,
        notes: input.notes,
        workPerformed: input.workPerformed,
        externalCompany: input.externalCompany,
        nextDueOn: input.nextDueOn ? dayToDb(input.nextDueOn) : null,
        recordedById: actor.id,
      },
      include: {
        recordedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 2. Schedule dates updates on PASS
    if (input.outcome === EquipmentOutcome.PASS) {
      if (input.kind === EquipmentRecordKind.CALIBRATION && input.nextDueOn) {
        await tx.resource.update({
          where: { id: resourceId },
          data: { nextCalibrationDueOn: dayToDb(input.nextDueOn) },
        });
        resultMessage = `Calibration recorded. Next calibration due ${formatEquipmentDay(input.nextDueOn)}.`;
      } else if (input.kind === EquipmentRecordKind.PREVENTIVE_MAINTENANCE && input.nextDueOn) {
        await tx.resource.update({
          where: { id: resourceId },
          data: { nextMaintenanceDueOn: dayToDb(input.nextDueOn) },
        });
        resultMessage = `Service recorded. Next service due ${formatEquipmentDay(input.nextDueOn)}.`;
      }
    } else if (input.kind === EquipmentRecordKind.REPLACEMENT_REVIEW && input.nextDueOn) {
      await tx.resource.update({
        where: { id: resourceId },
        data: { replacementReviewDueOn: dayToDb(input.nextDueOn) },
      });
      resultMessage = "Review recorded.";
    }

    // 3. FAIL on ACTIVE resource -> takes OUT_OF_SERVICE and cancels future bookings
    if (input.outcome === EquipmentOutcome.FAIL && resource.status === ResourceStatus.ACTIVE) {
      const kindLabel =
        input.kind === EquipmentRecordKind.CALIBRATION
          ? "calibration"
          : input.kind === EquipmentRecordKind.PREVENTIVE_MAINTENANCE
            ? "preventive maintenance"
            : input.kind === EquipmentRecordKind.PERFORMANCE_CHECK
              ? "performance check"
              : "repair";

      const failReason = `Failed ${kindLabel} on ${formatEquipmentDay(input.performedOn)}: ${input.notes ?? ""}`;
      cancelledCount = await takeResourceOutOfServiceInTx(tx, resourceId, actor.id, failReason);

      // E2: notifications (CHECK_FAILED notification trigger)

      resultMessage = `Result recorded. ${resource.name} taken out of service; ${cancelledCount} bookings cancelled.`;
    }

    // 4. NOT_DONE does not move schedule dates; returns clear feedback
    if (input.outcome === EquipmentOutcome.NOT_DONE) {
      const trackerDueOn =
        input.kind === EquipmentRecordKind.CALIBRATION
          ? resource.nextCalibrationDueOn
            ? dbToDay(resource.nextCalibrationDueOn)
            : input.performedOn
          : resource.nextMaintenanceDueOn
            ? dbToDay(resource.nextMaintenanceDueOn)
            : input.performedOn;

      const trackerLabel =
        input.kind === EquipmentRecordKind.CALIBRATION ? "calibration" : "service";
      resultMessage = `Saved as not done. ${resource.name} cannot be booked after ${formatEquipmentDay(trackerDueOn)} until the ${trackerLabel} is recorded.`;
    }

    // 5. Repeated repairs rule: after a REPAIR record, if >= 3 repairs in last 365 days
    if (input.kind === EquipmentRecordKind.REPAIR) {
      const cutoffDay = addDaysToDay(today, -REPLACEMENT_REVIEW_REPAIR_DAYS);
      const repairCount = await tx.equipmentRecord.count({
        where: {
          resourceId,
          kind: EquipmentRecordKind.REPAIR,
          performedOn: { gte: dayToDb(cutoffDay) },
        },
      });

      if (repairCount >= REPLACEMENT_REVIEW_REPAIRS) {
        const todayDb = dayToDb(today);
        if (
          !resource.replacementReviewDueOn ||
          resource.replacementReviewDueOn.getTime() > todayDb.getTime()
        ) {
          await tx.resource.update({
            where: { id: resourceId },
            data: { replacementReviewDueOn: todayDb },
          });
        }
      }
    }

    // E2: notifications (resolve open notifications for passing calibration / maintenance)

    return createdRecord;
  });

  return {
    ok: true,
    data: {
      record,
      cancelledBookingsCount: cancelledCount,
    },
    message: resultMessage,
  };
}

/**
 * Mark a scheduled task as done on the lab today.
 * Default next due date is today + intervalDays.
 */
export async function markDone(
  actor: UserLike & { id: string },
  resourceId: string,
  tracker: "calibration" | "maintenance",
  rawInput: {
    outcome?: EquipmentOutcome;
    performedBy: string;
    reference?: string | null;
    notes?: string | null;
    workPerformed?: string | null;
    externalCompany?: string | null;
    nextDueOn?: string | null;
  },
): Promise<ServiceResult<{ record: EquipmentRecordItem; cancelledBookingsCount?: number }>> {
  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    select: {
      calibrationIntervalDays: true,
      maintenanceIntervalDays: true,
    },
  });

  const today = labToday();
  const kind =
    tracker === "calibration"
      ? EquipmentRecordKind.CALIBRATION
      : EquipmentRecordKind.PREVENTIVE_MAINTENANCE;

  const interval =
    tracker === "calibration"
      ? resource?.calibrationIntervalDays
      : resource?.maintenanceIntervalDays;

  let nextDueOn = rawInput.nextDueOn;
  if (!nextDueOn && rawInput.outcome !== EquipmentOutcome.FAIL && interval) {
    nextDueOn = addDaysToDay(today, interval);
  }

  return addEquipmentRecord(actor, resourceId, {
    kind,
    outcome: rawInput.outcome ?? EquipmentOutcome.PASS,
    performedOn: today,
    performedBy: rawInput.performedBy,
    reference: rawInput.reference,
    notes: rawInput.notes,
    workPerformed: rawInput.workPerformed,
    externalCompany: rawInput.externalCompany,
    nextDueOn,
  });
}

/**
 * Mark a scheduled task as not done today (reason required, optional planned date).
 */
export async function markNotDone(
  actor: UserLike & { id: string },
  resourceId: string,
  tracker: "calibration" | "maintenance",
  rawInput: {
    notes: string;
    plannedDate?: string | null;
  },
): Promise<ServiceResult<{ record: EquipmentRecordItem; cancelledBookingsCount?: number }>> {
  const today = labToday();
  const kind =
    tracker === "calibration"
      ? EquipmentRecordKind.CALIBRATION
      : EquipmentRecordKind.PREVENTIVE_MAINTENANCE;

  return addEquipmentRecord(actor, resourceId, {
    kind,
    outcome: EquipmentOutcome.NOT_DONE,
    performedOn: today,
    performedBy: (actor as { name?: string }).name ?? "Site Manager",
    notes: rawInput.notes,
    nextDueOn: rawInput.plannedDate,
  });
}

export interface EquipmentOverviewFilters {
  siteId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface EquipmentOverviewItem {
  id: string;
  name: string;
  location: string | null;
  status: ResourceStatus;
  category: {
    id: string;
    name: string;
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
  nextCalibrationDueOn: Date | null;
  nextMaintenanceDueOn: Date | null;
  replacementReviewDueOn: Date | null;
  calibrationIntervalDays: number | null;
  maintenanceIntervalDays: number | null;
  calibrationStatus: TrackerStatus;
  maintenanceStatus: TrackerStatus;
  reviewStatus: TrackerStatus;
  urgencyRank: number;
}

export interface EquipmentOverviewResult {
  items: EquipmentOverviewItem[];
  counts: {
    dueToday: number;
    overdueOrFailed: number;
    dueSoon: number;
    replacementReviewsDue: number;
  };
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

function urgencyRankOf(calib: TrackerStatus, maint: TrackerStatus, review: TrackerStatus): number {
  const rankMap: Record<TrackerStatus, number> = {
    FAILED: 1,
    OVERDUE: 2,
    DUE_TODAY: 3,
    DUE_SOON: 4,
    CURRENT: 5,
    NOT_TRACKED: 6,
  };
  return Math.min(rankMap[calib], rankMap[maint], rankMap[review]);
}

/**
 * Lists resources with schedules or reviews for the Equipment Care page.
 * Admins see all sites (or filter by site); managers see their own branch only.
 */
export async function listEquipmentOverview(
  actor: UserLike,
  filters: EquipmentOverviewFilters = {},
): Promise<ServiceResult<EquipmentOverviewResult>> {
  if (!canViewEquipmentOverview(actor)) {
    return { ok: false, error: "You do not have permission to view equipment overview." };
  }

  const allowedSites = equipmentOverviewSitesFor(actor);
  const where: Record<string, unknown> = {
    status: { not: ResourceStatus.RETIRED },
    OR: [
      { nextCalibrationDueOn: { not: null } },
      { nextMaintenanceDueOn: { not: null } },
      { replacementReviewDueOn: { not: null } },
    ],
  };

  if (allowedSites === "all") {
    if (filters.siteId && filters.siteId.trim() !== "") {
      where.siteId = filters.siteId.trim();
    }
  } else {
    // Manager: strictly their own site
    where.siteId = { in: allowedSites };
  }

  const allMatching = await db.resource.findMany({
    where,
    include: {
      category: {
        select: {
          id: true,
          name: true,
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
      equipmentRecords: {
        where: {
          kind: {
            in: [
              EquipmentRecordKind.CALIBRATION,
              EquipmentRecordKind.PERFORMANCE_CHECK,
              EquipmentRecordKind.REPAIR,
            ],
          },
        },
        orderBy: [{ performedOn: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { outcome: true },
      },
    },
    orderBy: [{ site: { name: "asc" } }, { name: "asc" }],
  });

  const today = labToday();

  let countDueToday = 0;
  let countOverdueOrFailed = 0;
  let countDueSoon = 0;
  let countReplacementReviewsDue = 0;

  const enriched: EquipmentOverviewItem[] = allMatching.map((res) => {
    const latestCalibRecord = res.equipmentRecords?.[0];
    const isFailed = latestCalibRecord?.outcome === EquipmentOutcome.FAIL;

    const calibStatus = trackerStatus({
      dueOn: res.nextCalibrationDueOn ? dbToDay(res.nextCalibrationDueOn) : null,
      today,
      dueSoonDays: CALIBRATION_DUE_SOON_DAYS,
      failed: isFailed,
    });

    const maintStatus = trackerStatus({
      dueOn: res.nextMaintenanceDueOn ? dbToDay(res.nextMaintenanceDueOn) : null,
      today,
      dueSoonDays: MAINTENANCE_DUE_SOON_DAYS,
    });

    const revStatus = trackerStatus({
      dueOn: res.replacementReviewDueOn ? dbToDay(res.replacementReviewDueOn) : null,
      today,
      dueSoonDays: REPLACEMENT_REVIEW_LEAD_DAYS,
    });

    // Count statistics
    if (calibStatus === "DUE_TODAY" || maintStatus === "DUE_TODAY") {
      countDueToday++;
    }
    if (
      calibStatus === "OVERDUE" ||
      calibStatus === "FAILED" ||
      maintStatus === "OVERDUE" ||
      maintStatus === "FAILED"
    ) {
      countOverdueOrFailed++;
    }
    if (calibStatus === "DUE_SOON" || maintStatus === "DUE_SOON") {
      countDueSoon++;
    }
    if (revStatus === "DUE_TODAY" || revStatus === "OVERDUE") {
      countReplacementReviewsDue++;
    }

    const urgencyRank = urgencyRankOf(calibStatus, maintStatus, revStatus);

    return {
      id: res.id,
      name: res.name,
      location: res.location,
      status: res.status,
      category: res.category,
      site: res.site,
      section: res.section,
      nextCalibrationDueOn: res.nextCalibrationDueOn,
      nextMaintenanceDueOn: res.nextMaintenanceDueOn,
      replacementReviewDueOn: res.replacementReviewDueOn,
      calibrationIntervalDays: res.calibrationIntervalDays,
      maintenanceIntervalDays: res.maintenanceIntervalDays,
      calibrationStatus: calibStatus,
      maintenanceStatus: maintStatus,
      reviewStatus: revStatus,
      urgencyRank,
    };
  });

  // Sort most urgent first
  enriched.sort((a, b) => {
    if (a.urgencyRank !== b.urgencyRank) {
      return a.urgencyRank - b.urgencyRank;
    }
    return a.name.localeCompare(b.name);
  });

  // Optional status filter
  let filtered = enriched;
  if (filters.status && filters.status.trim() !== "" && filters.status !== "ALL") {
    const targetStatus = filters.status.trim().toUpperCase();
    filtered = enriched.filter((item) => {
      if (targetStatus === "FAILED") {
        return item.calibrationStatus === "FAILED" || item.maintenanceStatus === "FAILED";
      }
      if (targetStatus === "OVERDUE") {
        return item.calibrationStatus === "OVERDUE" || item.maintenanceStatus === "OVERDUE";
      }
      if (targetStatus === "DUE_TODAY") {
        return item.calibrationStatus === "DUE_TODAY" || item.maintenanceStatus === "DUE_TODAY";
      }
      if (targetStatus === "DUE_SOON") {
        return item.calibrationStatus === "DUE_SOON" || item.maintenanceStatus === "DUE_SOON";
      }
      if (targetStatus === "CURRENT") {
        return item.calibrationStatus === "CURRENT" || item.maintenanceStatus === "CURRENT";
      }
      return true;
    });
  }

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, filters.pageSize ?? 10);
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    ok: true,
    data: {
      items: paginatedItems,
      counts: {
        dueToday: countDueToday,
        overdueOrFailed: countOverdueOrFailed,
        dueSoon: countDueSoon,
        replacementReviewsDue: countReplacementReviewsDue,
      },
      totalCount,
      totalPages,
      page,
      pageSize,
    },
  };
}

export interface TodayTaskItem {
  id: string; // unique composite key for list rendering
  resourceId: string;
  resourceName: string;
  resourceStatus: ResourceStatus;
  categoryIconKey: string;
  categoryName: string;
  siteId: string;
  siteName: string;
  tracker: "calibration" | "maintenance";
  dueOn: string;
  daysOverdue: number;
  status: "DUE_TODAY" | "OVERDUE";
  intervalDays: number | null;
  lastNotDone?: {
    notes: string;
    plannedDate: string | null;
  } | null;
  affectedBookingsCount: number;
}

/**
 * Lists tasks that are DUE_TODAY or OVERDUE for the Today list at the top of Equipment care.
 * Overdue first (sorted by days overdue desc), then due today.
 */
export async function listTodayTasks(actor: UserLike): Promise<ServiceResult<TodayTaskItem[]>> {
  if (!canViewEquipmentOverview(actor)) {
    return { ok: false, error: "You do not have permission to view today's tasks." };
  }

  const allowedSites = equipmentOverviewSitesFor(actor);
  const where: Record<string, unknown> = {
    status: { not: ResourceStatus.RETIRED },
    OR: [{ nextCalibrationDueOn: { not: null } }, { nextMaintenanceDueOn: { not: null } }],
  };

  if (allowedSites !== "all") {
    where.siteId = { in: allowedSites };
  }

  const resources = await db.resource.findMany({
    where,
    include: {
      category: {
        select: {
          id: true,
          name: true,
          iconKey: true,
        },
      },
      site: {
        select: {
          id: true,
          name: true,
        },
      },
      equipmentRecords: {
        where: {
          outcome: EquipmentOutcome.NOT_DONE,
        },
        orderBy: [{ performedOn: "desc" }, { createdAt: "desc" }],
        take: 5,
        select: {
          kind: true,
          notes: true,
          nextDueOn: true,
          performedOn: true,
        },
      },
    },
  });

  const today = labToday();
  const tasks: TodayTaskItem[] = [];

  for (const res of resources) {
    // 1. Calibration check
    if (res.nextCalibrationDueOn) {
      const calibDueOnStr = dbToDay(res.nextCalibrationDueOn);
      const calibStatus = trackerStatus({
        dueOn: calibDueOnStr,
        today,
        dueSoonDays: CALIBRATION_DUE_SOON_DAYS,
      });

      if (calibStatus === "DUE_TODAY" || calibStatus === "OVERDUE") {
        const daysOver = Math.max(0, daysBetween(calibDueOnStr, today));
        const lastNotDoneRec = res.equipmentRecords.find(
          (r) => r.kind === EquipmentRecordKind.CALIBRATION,
        );

        // Count CONFIRMED bookings ending after end of due day
        const endOfDue = endOfLabDay(calibDueOnStr);
        const affectedBookingsCount = await db.reservation.count({
          where: {
            resourceId: res.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            endAt: { gt: endOfDue },
          },
        });

        tasks.push({
          id: `${res.id}-calibration`,
          resourceId: res.id,
          resourceName: res.name,
          resourceStatus: res.status,
          categoryIconKey: res.category.iconKey,
          categoryName: res.category.name,
          siteId: res.site.id,
          siteName: res.site.name,
          tracker: "calibration",
          dueOn: calibDueOnStr,
          daysOverdue: daysOver,
          status: calibStatus,
          intervalDays: res.calibrationIntervalDays,
          lastNotDone: lastNotDoneRec
            ? {
                notes: lastNotDoneRec.notes ?? "",
                plannedDate: lastNotDoneRec.nextDueOn ? dbToDay(lastNotDoneRec.nextDueOn) : null,
              }
            : null,
          affectedBookingsCount,
        });
      }
    }

    // 2. Maintenance check
    if (res.nextMaintenanceDueOn) {
      const maintDueOnStr = dbToDay(res.nextMaintenanceDueOn);
      const maintStatus = trackerStatus({
        dueOn: maintDueOnStr,
        today,
        dueSoonDays: MAINTENANCE_DUE_SOON_DAYS,
      });

      if (maintStatus === "DUE_TODAY" || maintStatus === "OVERDUE") {
        const daysOver = Math.max(0, daysBetween(maintDueOnStr, today));
        const lastNotDoneRec = res.equipmentRecords.find(
          (r) => r.kind === EquipmentRecordKind.PREVENTIVE_MAINTENANCE,
        );

        const endOfDue = endOfLabDay(maintDueOnStr);
        const affectedBookingsCount = await db.reservation.count({
          where: {
            resourceId: res.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            endAt: { gt: endOfDue },
          },
        });

        tasks.push({
          id: `${res.id}-maintenance`,
          resourceId: res.id,
          resourceName: res.name,
          resourceStatus: res.status,
          categoryIconKey: res.category.iconKey,
          categoryName: res.category.name,
          siteId: res.site.id,
          siteName: res.site.name,
          tracker: "maintenance",
          dueOn: maintDueOnStr,
          daysOverdue: daysOver,
          status: maintStatus,
          intervalDays: res.maintenanceIntervalDays,
          lastNotDone: lastNotDoneRec
            ? {
                notes: lastNotDoneRec.notes ?? "",
                plannedDate: lastNotDoneRec.nextDueOn ? dbToDay(lastNotDoneRec.nextDueOn) : null,
              }
            : null,
          affectedBookingsCount,
        });
      }
    }
  }

  // Sorted: overdue (most days first), then due today
  tasks.sort((a, b) => {
    if (a.status === "OVERDUE" && b.status !== "OVERDUE") return -1;
    if (a.status !== "OVERDUE" && b.status === "OVERDUE") return 1;
    if (a.daysOverdue !== b.daysOverdue) return b.daysOverdue - a.daysOverdue;
    return a.resourceName.localeCompare(b.resourceName);
  });

  return { ok: true, data: tasks };
}
