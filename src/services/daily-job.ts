import "server-only";

import { subDays } from "date-fns";
import { db } from "@/lib/db";
import {
  ResourceStatus,
  ResourceWatchStatus,
  NotificationKind,
} from "@/generated/prisma/client";
import {
  CALIBRATION_DUE_SOON_DAYS,
  MAINTENANCE_DUE_SOON_DAYS,
  REPLACEMENT_REVIEW_LEAD_DAYS,
  NOTIFICATION_KEEP_DAYS,
} from "@/config/rules";
import { dbToDay, daysBetween } from "@/lib/equipment-dates";
import { labToday } from "@/lib/time";
import { notifyInTx, recipientsForSite } from "@/services/notifications";
import { checkWatchesForResource } from "@/services/watches";

export interface DailyJobResult {
  ok: boolean;
  remindersCreated: number;
  expiredWatches: number;
  deletedNotifications: number;
}

/**
 * Syncs equipment due reminders (DUE_SOON, DUE_TODAY, OVERDUE, REVIEW_DUE).
 * Idempotent via dedupe_key: "<kind>:<tracker>:<resourceId>:<dueOn>".
 */
export async function syncEquipmentReminders(
  todayOrNow: string | Date = labToday(),
): Promise<number> {
  const today =
    typeof todayOrNow === "string"
      ? todayOrNow
      : labToday(undefined, todayOrNow);
  const resources = await db.resource.findMany({
    where: {
      status: { not: ResourceStatus.RETIRED },
    },
    select: {
      id: true,
      name: true,
      siteId: true,
      nextCalibrationDueOn: true,
      nextMaintenanceDueOn: true,
      replacementReviewDueOn: true,
    },
  });

  let reminderCount = 0;

  for (const resource of resources) {
    // 1. Calibration
    if (resource.nextCalibrationDueOn) {
      const dueOn = dbToDay(resource.nextCalibrationDueOn);
      const diff = daysBetween(today, dueOn);

      if (dueOn < today) {
        // OVERDUE -> site managers + admins
        const { count } = await db.$transaction(async (tx) => {
          const recipients = await recipientsForSite(tx, resource.siteId, { includeAdmins: true });
          return await notifyInTx(tx, recipients, {
            kind: NotificationKind.OVERDUE,
            title: `Calibration overdue: ${resource.name}`,
            body: `${resource.name} is overdue for calibration since ${dueOn}.`,
            link: `/resources/${resource.id}`,
            resourceId: resource.id,
            dedupeKey: `OVERDUE:CALIBRATION:${resource.id}:${dueOn}`,
          });
        });
        reminderCount += count;
      } else if (dueOn === today) {
        // DUE_TODAY -> site managers
        const { count } = await db.$transaction(async (tx) => {
          const recipients = await recipientsForSite(tx, resource.siteId, { includeAdmins: false });
          return await notifyInTx(tx, recipients, {
            kind: NotificationKind.DUE_TODAY,
            title: `Calibration due today: ${resource.name}`,
            body: `${resource.name} is scheduled for calibration today (${dueOn}).`,
            link: `/resources/${resource.id}`,
            resourceId: resource.id,
            dedupeKey: `DUE_TODAY:CALIBRATION:${resource.id}:${dueOn}`,
          });
        });
        reminderCount += count;
      } else if (diff > 0 && diff <= CALIBRATION_DUE_SOON_DAYS) {
        // DUE_SOON -> site managers
        const { count } = await db.$transaction(async (tx) => {
          const recipients = await recipientsForSite(tx, resource.siteId, { includeAdmins: false });
          return await notifyInTx(tx, recipients, {
            kind: NotificationKind.DUE_SOON,
            title: `Calibration due soon: ${resource.name}`,
            body: `${resource.name} calibration is due on ${dueOn} (${diff} day(s) remaining).`,
            link: `/resources/${resource.id}`,
            resourceId: resource.id,
            dedupeKey: `DUE_SOON:CALIBRATION:${resource.id}:${dueOn}`,
          });
        });
        reminderCount += count;
      }
    }

    // 2. Preventive Maintenance
    if (resource.nextMaintenanceDueOn) {
      const dueOn = dbToDay(resource.nextMaintenanceDueOn);
      const diff = daysBetween(today, dueOn);

      if (dueOn < today) {
        // OVERDUE -> site managers + admins
        const { count } = await db.$transaction(async (tx) => {
          const recipients = await recipientsForSite(tx, resource.siteId, { includeAdmins: true });
          return await notifyInTx(tx, recipients, {
            kind: NotificationKind.OVERDUE,
            title: `Maintenance overdue: ${resource.name}`,
            body: `${resource.name} is overdue for preventive maintenance since ${dueOn}.`,
            link: `/resources/${resource.id}`,
            resourceId: resource.id,
            dedupeKey: `OVERDUE:MAINTENANCE:${resource.id}:${dueOn}`,
          });
        });
        reminderCount += count;
      } else if (dueOn === today) {
        // DUE_TODAY -> site managers
        const { count } = await db.$transaction(async (tx) => {
          const recipients = await recipientsForSite(tx, resource.siteId, { includeAdmins: false });
          return await notifyInTx(tx, recipients, {
            kind: NotificationKind.DUE_TODAY,
            title: `Maintenance due today: ${resource.name}`,
            body: `${resource.name} is scheduled for preventive maintenance today (${dueOn}).`,
            link: `/resources/${resource.id}`,
            resourceId: resource.id,
            dedupeKey: `DUE_TODAY:MAINTENANCE:${resource.id}:${dueOn}`,
          });
        });
        reminderCount += count;
      } else if (diff > 0 && diff <= MAINTENANCE_DUE_SOON_DAYS) {
        // DUE_SOON -> site managers
        const { count } = await db.$transaction(async (tx) => {
          const recipients = await recipientsForSite(tx, resource.siteId, { includeAdmins: false });
          return await notifyInTx(tx, recipients, {
            kind: NotificationKind.DUE_SOON,
            title: `Maintenance due soon: ${resource.name}`,
            body: `${resource.name} maintenance is due on ${dueOn} (${diff} day(s) remaining).`,
            link: `/resources/${resource.id}`,
            resourceId: resource.id,
            dedupeKey: `DUE_SOON:MAINTENANCE:${resource.id}:${dueOn}`,
          });
        });
        reminderCount += count;
      }
    }

    // 3. Replacement Review
    if (resource.replacementReviewDueOn) {
      const dueOn = dbToDay(resource.replacementReviewDueOn);
      const diff = daysBetween(today, dueOn);

      if (dueOn <= today || diff <= REPLACEMENT_REVIEW_LEAD_DAYS) {
        // REVIEW_DUE -> site managers + admins
        const { count } = await db.$transaction(async (tx) => {
          const recipients = await recipientsForSite(tx, resource.siteId, { includeAdmins: true });
          return await notifyInTx(tx, recipients, {
            kind: NotificationKind.REVIEW_DUE,
            title: `Replacement review due: ${resource.name}`,
            body: `${resource.name} is due for lifecycle replacement review (scheduled for ${dueOn}).`,
            link: `/resources/${resource.id}`,
            resourceId: resource.id,
            dedupeKey: `REVIEW_DUE:REPLACEMENT_REVIEW:${resource.id}:${dueOn}`,
          });
        });
        reminderCount += count;
      }
    }
  }

  return reminderCount;
}

/**
 * Runs the complete idempotent daily job:
 * 1. Syncs equipment reminders (DUE_SOON, DUE_TODAY, OVERDUE, REVIEW_DUE)
 * 2. Expires old resource watches
 * 3. Checks watches for resources with active watches
 * 4. Deletes read notifications older than NOTIFICATION_KEEP_DAYS
 */
export async function runDailyJob(
  todayOrNow: string | Date = labToday(),
  now: Date = new Date(),
): Promise<DailyJobResult> {
  const today =
    typeof todayOrNow === "string"
      ? todayOrNow
      : labToday(undefined, todayOrNow);
  const nowInstant = todayOrNow instanceof Date ? todayOrNow : now;

  // 1. Equipment reminders
  const remindersCreated = await syncEquipmentReminders(today);

  // 2. Expire old active watches
  const expiredWatchesResult = await db.resourceWatch.updateMany({
    where: {
      status: ResourceWatchStatus.ACTIVE,
      expiresAt: { lte: nowInstant },
    },
    data: {
      status: ResourceWatchStatus.EXPIRED,
    },
  });

  // 3. Run watches check on resources with remaining active watches
  const activeWatchesResources = await db.resourceWatch.findMany({
    where: {
      status: ResourceWatchStatus.ACTIVE,
      expiresAt: { gt: now },
    },
    select: { resourceId: true },
    distinct: ["resourceId"],
  });

  for (const { resourceId } of activeWatchesResources) {
    await checkWatchesForResource(resourceId, undefined, now);
  }

  // 4. Delete read notifications older than NOTIFICATION_KEEP_DAYS (90 days)
  const cutoffDate = subDays(now, NOTIFICATION_KEEP_DAYS);
  const deletedResult = await db.notification.deleteMany({
    where: {
      readAt: {
        not: null,
        lt: cutoffDate,
      },
    },
  });

  return {
    ok: true,
    remindersCreated,
    expiredWatches: expiredWatchesResult.count,
    deletedNotifications: deletedResult.count,
  };
}
