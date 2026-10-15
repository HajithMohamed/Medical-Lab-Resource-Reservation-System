import "server-only";

import { z } from "zod";
import { db } from "@/lib/db";
import { canManageSite, type UserLike } from "@/lib/permissions";
import { isUniqueError } from "@/lib/db-errors";
import {
  ResourceStatus,
  ReservationKind,
  ReservationStatus,
  EquipmentRecordKind,
  EquipmentOutcome,
  NotificationKind,
  type Prisma,
} from "@/generated/prisma/client";
import {
  MAX_EQUIPMENT_INTERVAL_DAYS,
  MAX_SERVICE_LIFE_YEARS,
  CALIBRATION_DUE_SOON_DAYS,
  MAINTENANCE_DUE_SOON_DAYS,
  REPLACEMENT_REVIEW_LEAD_DAYS,
} from "@/config/rules";
import { equipmentPartsFor } from "@/config/equipment";
import { isValidDay, dayToDb, dbToDay, addYearsToDay } from "@/lib/equipment-dates";
import { labToday, formatLabDate, formatLabTime } from "@/lib/time";
import { trackerStatus, type TrackerStatus } from "@/lib/equipment-status";
import { notifyInTx } from "@/services/notifications";
import { checkWatchesForResource } from "@/services/watches";

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
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  inServiceOn?: Date | null;
  expectedServiceLifeYears?: number | null;
  calibrationIntervalDays?: number | null;
  nextCalibrationDueOn?: Date | null;
  maintenanceIntervalDays?: number | null;
  nextMaintenanceDueOn?: Date | null;
  replacementReviewDueOn?: Date | null;
  calibrationStatus?: TrackerStatus;
  maintenanceStatus?: TrackerStatus;
  reviewStatus?: TrackerStatus;
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

export const resourceInputSchema = z
  .object({
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

    // Part 2: Equipment details
    manufacturer: z
      .string()
      .trim()
      .max(100, "Manufacturer cannot exceed 100 characters.")
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    model: z
      .string()
      .trim()
      .max(100, "Model cannot exceed 100 characters.")
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    serialNumber: z
      .string()
      .trim()
      .max(100, "Serial / registration number cannot exceed 100 characters.")
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    inServiceOn: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    expectedServiceLifeYears: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
      z
        .number()
        .int("Expected service life must be a whole number of years.")
        .min(1, "Expected service life must be at least 1 year.")
        .max(
          MAX_SERVICE_LIFE_YEARS,
          `Expected service life cannot exceed ${MAX_SERVICE_LIFE_YEARS} years.`,
        )
        .optional()
        .nullable(),
    ),
    replacementReviewDueOn: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),

    // Part 3: Calibration
    needsCalibration: z
      .preprocess((v) => v === true || v === "true" || v === "on" || v === "1", z.boolean())
      .optional()
      .default(false),
    calibrationIntervalDays: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
      z
        .number()
        .int("Calibration interval must be in whole days.")
        .min(1, "Calibration interval must be at least 1 day.")
        .max(
          MAX_EQUIPMENT_INTERVAL_DAYS,
          `Calibration interval cannot exceed ${MAX_EQUIPMENT_INTERVAL_DAYS} days.`,
        )
        .optional()
        .nullable(),
    ),
    lastCalibratedOn: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    calibratedBy: z
      .string()
      .trim()
      .max(120, "Calibrated by cannot exceed 120 characters.")
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    calibrationReference: z
      .string()
      .trim()
      .max(120, "Certificate or reference cannot exceed 120 characters.")
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    nextCalibrationDueOn: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),

    // Part 4: Preventive maintenance
    needsMaintenance: z
      .preprocess((v) => v === true || v === "true" || v === "on" || v === "1", z.boolean())
      .optional()
      .default(false),
    maintenanceIntervalDays: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
      z
        .number()
        .int("Maintenance interval must be in whole days.")
        .min(1, "Maintenance interval must be at least 1 day.")
        .max(
          MAX_EQUIPMENT_INTERVAL_DAYS,
          `Maintenance interval cannot exceed ${MAX_EQUIPMENT_INTERVAL_DAYS} days.`,
        )
        .optional()
        .nullable(),
    ),
    lastServicedOn: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    servicedBy: z
      .string()
      .trim()
      .max(120, "Serviced by cannot exceed 120 characters.")
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    nextMaintenanceDueOn: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
  })
  .superRefine((data, ctx) => {
    const today = labToday();

    // Date format validations
    const dateFields: Array<[string, string | null | undefined, string]> = [
      ["inServiceOn", data.inServiceOn, "In-service date must be a valid date (YYYY-MM-DD)."],
      [
        "replacementReviewDueOn",
        data.replacementReviewDueOn,
        "Replacement review date must be a valid date (YYYY-MM-DD).",
      ],
      [
        "lastCalibratedOn",
        data.lastCalibratedOn,
        "Last calibrated date must be a valid date (YYYY-MM-DD).",
      ],
      [
        "nextCalibrationDueOn",
        data.nextCalibrationDueOn,
        "Next calibration due date must be a valid date (YYYY-MM-DD).",
      ],
      [
        "lastServicedOn",
        data.lastServicedOn,
        "Last serviced date must be a valid date (YYYY-MM-DD).",
      ],
      [
        "nextMaintenanceDueOn",
        data.nextMaintenanceDueOn,
        "Next service due date must be a valid date (YYYY-MM-DD).",
      ],
    ];

    for (const [field, val, msg] of dateFields) {
      if (val && !isValidDay(val)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: [field] });
      }
    }

    // Dates not in future
    if (data.inServiceOn && isValidDay(data.inServiceOn) && data.inServiceOn > today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "In-service date cannot be in the future.",
        path: ["inServiceOn"],
      });
    }
    if (
      data.lastCalibratedOn &&
      isValidDay(data.lastCalibratedOn) &&
      data.lastCalibratedOn > today
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Last calibration date cannot be in the future.",
        path: ["lastCalibratedOn"],
      });
    }
    if (data.lastServicedOn && isValidDay(data.lastServicedOn) && data.lastServicedOn > today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Last serviced date cannot be in the future.",
        path: ["lastServicedOn"],
      });
    }

    // Next due after last ... on
    if (
      data.lastCalibratedOn &&
      data.nextCalibrationDueOn &&
      isValidDay(data.lastCalibratedOn) &&
      isValidDay(data.nextCalibrationDueOn) &&
      data.nextCalibrationDueOn <= data.lastCalibratedOn
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Next calibration due date must be after last calibrated date.",
        path: ["nextCalibrationDueOn"],
      });
    }

    if (
      data.lastServicedOn &&
      data.nextMaintenanceDueOn &&
      isValidDay(data.lastServicedOn) &&
      isValidDay(data.nextMaintenanceDueOn) &&
      data.nextMaintenanceDueOn <= data.lastServicedOn
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Next service due date must be after last serviced date.",
        path: ["nextMaintenanceDueOn"],
      });
    }

    // Calibration switch on checks
    if (data.needsCalibration) {
      if (!data.calibrationIntervalDays || !data.nextCalibrationDueOn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter the interval and the next due date, or switch calibration off.",
          path: ["calibrationIntervalDays"],
        });
      }
      if (data.lastCalibratedOn && !data.calibratedBy) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter who performed the last calibration.",
          path: ["calibratedBy"],
        });
      }
    }

    // Preventive maintenance switch on checks
    if (data.needsMaintenance) {
      if (!data.maintenanceIntervalDays || !data.nextMaintenanceDueOn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Enter the interval and the next due date, or switch preventive maintenance off.",
          path: ["maintenanceIntervalDays"],
        });
      }
      if (data.lastServicedOn && !data.servicedBy) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter who performed the last service.",
          path: ["servicedBy"],
        });
      }
    }
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
        select: {
          outcome: true,
        },
      },
    },
    orderBy: [{ site: { name: "asc" } }, { category: { name: "asc" } }, { name: "asc" }],
  });

  const today = labToday();
  const enrichedResources: ResourceListItem[] = resources.map((res) => {
    const latestCalibRecord = res.equipmentRecords?.[0];
    const isFailed = latestCalibRecord?.outcome === EquipmentOutcome.FAIL;

    const calibrationStatus = trackerStatus({
      dueOn: res.nextCalibrationDueOn ? dbToDay(res.nextCalibrationDueOn) : null,
      today,
      dueSoonDays: CALIBRATION_DUE_SOON_DAYS,
      failed: isFailed,
    });

    const maintenanceStatus = trackerStatus({
      dueOn: res.nextMaintenanceDueOn ? dbToDay(res.nextMaintenanceDueOn) : null,
      today,
      dueSoonDays: MAINTENANCE_DUE_SOON_DAYS,
    });

    const reviewStatus = trackerStatus({
      dueOn: res.replacementReviewDueOn ? dbToDay(res.replacementReviewDueOn) : null,
      today,
      dueSoonDays: REPLACEMENT_REVIEW_LEAD_DAYS,
    });

    return {
      ...res,
      calibrationStatus,
      maintenanceStatus,
      reviewStatus,
    };
  });

  return { ok: true, data: enrichedResources, totalCount, totalPages };
}

/**
 * Loads a resource by ID along with:
 * - its category (and booking limit), site, and section
 * - its CONFIRMED reservations in the next 7 days (with booking user)
 * - its last 5 maintenance blocks
 * - its computed tracker statuses
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
        select: {
          outcome: true,
        },
      },
    },
  });

  if (!resource) {
    return { ok: false, error: "Resource not found." };
  }

  const today = labToday();
  const latestCalibRecord = resource.equipmentRecords?.[0];
  const isFailed = latestCalibRecord?.outcome === EquipmentOutcome.FAIL;

  const calibrationStatus = trackerStatus({
    dueOn: resource.nextCalibrationDueOn ? dbToDay(resource.nextCalibrationDueOn) : null,
    today,
    dueSoonDays: CALIBRATION_DUE_SOON_DAYS,
    failed: isFailed,
  });

  const maintenanceStatus = trackerStatus({
    dueOn: resource.nextMaintenanceDueOn ? dbToDay(resource.nextMaintenanceDueOn) : null,
    today,
    dueSoonDays: MAINTENANCE_DUE_SOON_DAYS,
  });

  const reviewStatus = trackerStatus({
    dueOn: resource.replacementReviewDueOn ? dbToDay(resource.replacementReviewDueOn) : null,
    today,
    dueSoonDays: REPLACEMENT_REVIEW_LEAD_DAYS,
  });

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
      calibrationStatus,
      maintenanceStatus,
      reviewStatus,
      reservationsNext7Days,
      recentMaintenance,
    },
  };
}

/**
 * Helper function to take a resource out of service inside a transaction.
 * Cancels future CONFIRMED bookings with reason and updates resource status.
 */
export async function takeResourceOutOfServiceInTx(
  tx: Prisma.TransactionClient,
  resourceId: string,
  actorId: string,
  reason: string,
): Promise<number> {
  const now = new Date();
  const bookingsToCancel = await tx.reservation.findMany({
    where: {
      resourceId,
      kind: ReservationKind.BOOKING,
      status: ReservationStatus.CONFIRMED,
      startAt: { gt: now },
    },
    include: {
      resource: { select: { id: true, name: true } },
    },
  });

  if (bookingsToCancel.length > 0) {
    await tx.reservation.updateMany({
      where: {
        id: { in: bookingsToCancel.map((b) => b.id) },
      },
      data: {
        status: ReservationStatus.CANCELLED,
        cancelReason: `Resource out of service: ${reason}`,
        cancelledAt: now,
        cancelledById: actorId,
      },
    });

    for (const b of bookingsToCancel) {
      if (b.createdById !== actorId) {
        await notifyInTx(
          tx,
          [b.createdById],
          {
            kind: NotificationKind.BOOKING_CANCELLED,
            title: `Booking cancelled: ${b.resource.name}`,
            body: `Your booking for ${b.resource.name} on ${formatLabDate(b.startAt)} from ${formatLabTime(b.startAt)} to ${formatLabTime(b.endAt)} was cancelled. Reason: ${reason}.`,
            link: "/bookings?tab=cancelled",
            resourceId: b.resourceId,
            dedupeKey: `booking-cancelled:${b.id}`,
            actorId,
          },
        );
      }
    }
  }

  await tx.resource.update({
    where: { id: resourceId },
    data: { status: ResourceStatus.OUT_OF_SERVICE },
  });

  return bookingsToCancel.length;
}

/**
 * Creates a new resource. Enforces canManageSite for the target site.
 * Name must be unique within the site.
 * Initial calibration and maintenance records are added if performed dates are given.
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

  // Validate category existence with iconKey
  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { id: true, iconKey: true },
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

  const allowedParts = equipmentPartsFor(category.iconKey);
  const hasDetails = allowedParts.includes("details");
  const hasCalibration = allowedParts.includes("calibration");
  const hasMaintenance = allowedParts.includes("maintenance");

  const manufacturer = hasDetails ? (parsed.data.manufacturer ?? null) : null;
  const model = hasDetails ? (parsed.data.model ?? null) : null;
  const serialNumber = hasDetails ? (parsed.data.serialNumber ?? null) : null;
  const inServiceOn =
    hasDetails && parsed.data.inServiceOn ? dayToDb(parsed.data.inServiceOn) : null;
  const expectedServiceLifeYears = hasDetails
    ? (parsed.data.expectedServiceLifeYears ?? null)
    : null;

  let computedReviewDueOnDay: string | null = null;
  if (hasDetails) {
    if (parsed.data.replacementReviewDueOn) {
      computedReviewDueOnDay = parsed.data.replacementReviewDueOn;
    } else if (parsed.data.inServiceOn && parsed.data.expectedServiceLifeYears) {
      computedReviewDueOnDay = addYearsToDay(
        parsed.data.inServiceOn,
        parsed.data.expectedServiceLifeYears,
      );
    }
  }
  const replacementReviewDueOn = computedReviewDueOnDay ? dayToDb(computedReviewDueOnDay) : null;

  const needsCalibration = hasCalibration && Boolean(parsed.data.needsCalibration);
  const calibrationIntervalDays = needsCalibration
    ? (parsed.data.calibrationIntervalDays ?? null)
    : null;
  const nextCalibrationDueOn =
    needsCalibration && parsed.data.nextCalibrationDueOn
      ? dayToDb(parsed.data.nextCalibrationDueOn)
      : null;
  const lastCalibratedOn =
    needsCalibration && parsed.data.lastCalibratedOn ? parsed.data.lastCalibratedOn : null;
  const calibratedBy =
    needsCalibration && parsed.data.calibratedBy ? parsed.data.calibratedBy : null;
  const calibrationReference =
    needsCalibration && parsed.data.calibrationReference ? parsed.data.calibrationReference : null;

  const needsMaintenance = hasMaintenance && Boolean(parsed.data.needsMaintenance);
  const maintenanceIntervalDays = needsMaintenance
    ? (parsed.data.maintenanceIntervalDays ?? null)
    : null;
  const nextMaintenanceDueOn =
    needsMaintenance && parsed.data.nextMaintenanceDueOn
      ? dayToDb(parsed.data.nextMaintenanceDueOn)
      : null;
  const lastServicedOn =
    needsMaintenance && parsed.data.lastServicedOn ? parsed.data.lastServicedOn : null;
  const servicedBy = needsMaintenance && parsed.data.servicedBy ? parsed.data.servicedBy : null;

  try {
    const created = await db.$transaction(async (tx) => {
      const res = await tx.resource.create({
        data: {
          name,
          siteId,
          categoryId,
          sectionId,
          location,
          capacity,
          status: ResourceStatus.ACTIVE,
          manufacturer,
          model,
          serialNumber,
          inServiceOn,
          expectedServiceLifeYears,
          replacementReviewDueOn,
          calibrationIntervalDays,
          nextCalibrationDueOn,
          maintenanceIntervalDays,
          nextMaintenanceDueOn,
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

      // If lastCalibratedOn is given, add an initial EquipmentRecord CALIBRATION / PASS
      if (lastCalibratedOn && actor.id) {
        await tx.equipmentRecord.create({
          data: {
            resourceId: res.id,
            kind: EquipmentRecordKind.CALIBRATION,
            outcome: EquipmentOutcome.PASS,
            performedOn: dayToDb(lastCalibratedOn),
            performedBy: calibratedBy ?? "Unknown",
            reference: calibrationReference,
            workPerformed: `Initial record: last calibrated on ${lastCalibratedOn}, entered at registration.`,
            nextDueOn: nextCalibrationDueOn,
            notes: "Entered when the resource was registered",
            recordedById: actor.id,
          },
        });
      }

      // If lastServicedOn is given, add an initial EquipmentRecord PREVENTIVE_MAINTENANCE / PASS
      if (lastServicedOn && actor.id) {
        await tx.equipmentRecord.create({
          data: {
            resourceId: res.id,
            kind: EquipmentRecordKind.PREVENTIVE_MAINTENANCE,
            outcome: EquipmentOutcome.PASS,
            performedOn: dayToDb(lastServicedOn),
            performedBy: servicedBy ?? "Unknown",
            workPerformed: `Initial record: last serviced on ${lastServicedOn}, entered at registration.`,
            nextDueOn: nextMaintenanceDueOn,
            notes: "Entered when the resource was registered",
            recordedById: actor.id,
          },
        });
      }

      return res;
    });

    const today = labToday();
    const calibrationStatus = trackerStatus({
      dueOn: created.nextCalibrationDueOn ? dbToDay(created.nextCalibrationDueOn) : null,
      today,
      dueSoonDays: CALIBRATION_DUE_SOON_DAYS,
    });
    const maintenanceStatus = trackerStatus({
      dueOn: created.nextMaintenanceDueOn ? dbToDay(created.nextMaintenanceDueOn) : null,
      today,
      dueSoonDays: MAINTENANCE_DUE_SOON_DAYS,
    });
    const reviewStatus = trackerStatus({
      dueOn: created.replacementReviewDueOn ? dbToDay(created.replacementReviewDueOn) : null,
      today,
      dueSoonDays: REPLACEMENT_REVIEW_LEAD_DAYS,
    });

    return {
      ok: true,
      data: {
        ...created,
        calibrationStatus,
        maintenanceStatus,
        reviewStatus,
      },
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
 * Status is NOT changed here. Equipment records are not created here.
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
    select: { id: true, iconKey: true },
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

  const allowedParts = equipmentPartsFor(category.iconKey);
  const hasDetails = allowedParts.includes("details");
  const hasCalibration = allowedParts.includes("calibration");
  const hasMaintenance = allowedParts.includes("maintenance");

  const manufacturer = hasDetails ? (parsed.data.manufacturer ?? null) : null;
  const model = hasDetails ? (parsed.data.model ?? null) : null;
  const serialNumber = hasDetails ? (parsed.data.serialNumber ?? null) : null;
  const inServiceOn =
    hasDetails && parsed.data.inServiceOn ? dayToDb(parsed.data.inServiceOn) : null;
  const expectedServiceLifeYears = hasDetails
    ? (parsed.data.expectedServiceLifeYears ?? null)
    : null;

  let computedReviewDueOnDay: string | null = null;
  if (hasDetails) {
    if (parsed.data.replacementReviewDueOn) {
      computedReviewDueOnDay = parsed.data.replacementReviewDueOn;
    } else if (parsed.data.inServiceOn && parsed.data.expectedServiceLifeYears) {
      computedReviewDueOnDay = addYearsToDay(
        parsed.data.inServiceOn,
        parsed.data.expectedServiceLifeYears,
      );
    }
  }
  const replacementReviewDueOn = computedReviewDueOnDay ? dayToDb(computedReviewDueOnDay) : null;

  const needsCalibration = hasCalibration && Boolean(parsed.data.needsCalibration);
  const calibrationIntervalDays = needsCalibration
    ? (parsed.data.calibrationIntervalDays ?? null)
    : null;
  const nextCalibrationDueOn =
    needsCalibration && parsed.data.nextCalibrationDueOn
      ? dayToDb(parsed.data.nextCalibrationDueOn)
      : null;

  const needsMaintenance = hasMaintenance && Boolean(parsed.data.needsMaintenance);
  const maintenanceIntervalDays = needsMaintenance
    ? (parsed.data.maintenanceIntervalDays ?? null)
    : null;
  const nextMaintenanceDueOn =
    needsMaintenance && parsed.data.nextMaintenanceDueOn
      ? dayToDb(parsed.data.nextMaintenanceDueOn)
      : null;

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
        manufacturer,
        model,
        serialNumber,
        inServiceOn,
        expectedServiceLifeYears,
        replacementReviewDueOn,
        calibrationIntervalDays,
        nextCalibrationDueOn,
        maintenanceIntervalDays,
        nextMaintenanceDueOn,
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
          select: {
            outcome: true,
          },
        },
      },
    });

    const today = labToday();
    const latestCalibRecord = updated.equipmentRecords?.[0];
    const isFailed = latestCalibRecord?.outcome === EquipmentOutcome.FAIL;

    const calibrationStatus = trackerStatus({
      dueOn: updated.nextCalibrationDueOn ? dbToDay(updated.nextCalibrationDueOn) : null,
      today,
      dueSoonDays: CALIBRATION_DUE_SOON_DAYS,
      failed: isFailed,
    });
    const maintenanceStatus = trackerStatus({
      dueOn: updated.nextMaintenanceDueOn ? dbToDay(updated.nextMaintenanceDueOn) : null,
      today,
      dueSoonDays: MAINTENANCE_DUE_SOON_DAYS,
    });
    const reviewStatus = trackerStatus({
      dueOn: updated.replacementReviewDueOn ? dbToDay(updated.replacementReviewDueOn) : null,
      today,
      dueSoonDays: REPLACEMENT_REVIEW_LEAD_DAYS,
    });

    return {
      ok: true,
      data: {
        ...updated,
        calibrationStatus,
        maintenanceStatus,
        reviewStatus,
      },
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
 * - Refuses return to ACTIVE if calibration is OVERDUE or FAILED.
 * - In ONE transaction: updates status and cancels all future CONFIRMED bookings.
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
      name: true,
      siteId: true,
      status: true,
      nextCalibrationDueOn: true,
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
        select: {
          outcome: true,
        },
      },
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

  if (stored.status === ResourceStatus.RETIRED) {
    return {
      ok: false,
      error: "This resource is retired. Its history is kept, but its status cannot change.",
    };
  }

  if (stored.status === newStatus) {
    return {
      ok: false,
      error: `The resource is already ${newStatus.toLowerCase().replace(/_/g, " ")}.`,
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

  if (newStatus === ResourceStatus.ACTIVE) {
    const today = labToday();
    const latestCalibRecord = stored.equipmentRecords?.[0];
    const isFailed = latestCalibRecord?.outcome === EquipmentOutcome.FAIL;
    const calibStatus = trackerStatus({
      dueOn: stored.nextCalibrationDueOn ? dbToDay(stored.nextCalibrationDueOn) : null,
      today,
      dueSoonDays: CALIBRATION_DUE_SOON_DAYS,
      failed: isFailed,
    });

    if (calibStatus === "OVERDUE" || calibStatus === "FAILED") {
      return {
        ok: false,
        error: `Record a passing calibration or performance check before putting ${stored.name} back in service.`,
      };
    }
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

  if (newStatus === ResourceStatus.OUT_OF_SERVICE) {
    await db.$transaction(async (tx) => {
      cancelledCount = await takeResourceOutOfServiceInTx(tx, id, actor.id, trimmedReason!);
    });
  } else if (newStatus === ResourceStatus.RETIRED) {
    const cancelReason = `Resource retired: ${trimmedReason}`;
    await db.$transaction(async (tx) => {
      const bookingsToCancel = await tx.reservation.findMany({
        where: {
          resourceId: id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          startAt: { gt: now },
        },
        include: {
          resource: { select: { id: true, name: true } },
        },
      });

      if (bookingsToCancel.length > 0) {
        await tx.reservation.updateMany({
          where: {
            id: { in: bookingsToCancel.map((b) => b.id) },
          },
          data: {
            status: ReservationStatus.CANCELLED,
            cancelReason,
            cancelledAt: now,
            cancelledById: actor.id,
          },
        });

        for (const b of bookingsToCancel) {
          if (b.createdById !== actor.id) {
            await notifyInTx(
              tx,
              [b.createdById],
              {
                kind: NotificationKind.BOOKING_CANCELLED,
                title: `Booking cancelled: ${b.resource.name}`,
                body: `Your booking for ${b.resource.name} on ${formatLabDate(b.startAt)} from ${formatLabTime(b.startAt)} to ${formatLabTime(b.endAt)} was cancelled. Reason: ${cancelReason}.`,
                link: "/bookings?tab=cancelled",
                resourceId: b.resourceId,
                dedupeKey: `booking-cancelled:${b.id}`,
                actorId: actor.id,
              },
            );
          }
        }
      }

      cancelledCount = bookingsToCancel.length;

      await tx.resource.update({
        where: { id },
        data: { status: ResourceStatus.RETIRED },
      });
    });
  } else {
    // Back to ACTIVE: only status changes
    await db.resource.update({
      where: { id },
      data: { status: ResourceStatus.ACTIVE },
    });
    // Trigger watches check after status change commits
    checkWatchesForResource(id).catch((err) =>
      console.error("[watches] Error checking watches on status ACTIVE:", err),
    );
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
