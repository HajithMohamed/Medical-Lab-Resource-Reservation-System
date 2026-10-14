import { daysBetween, dayToDb } from "./equipment-dates";
import { format } from "date-fns";

export type TrackerStatus =
  | "NOT_TRACKED"
  | "CURRENT"
  | "DUE_SOON"
  | "DUE_TODAY"
  | "OVERDUE"
  | "FAILED";

export interface TrackerStatusInput {
  dueOn?: string | null;
  today: string;
  dueSoonDays: number;
  failed?: boolean;
}

/**
 * Calculates tracker status for an equipment schedule.
 * - no dueOn -> NOT_TRACKED
 * - failed -> FAILED
 * - today > dueOn -> OVERDUE
 * - today === dueOn -> DUE_TODAY
 * - daysBetween(today, dueOn) <= dueSoonDays -> DUE_SOON
 * - else -> CURRENT
 * The due day itself is still valid (not Overdue; bookings ending by end of due day are allowed).
 */
export function trackerStatus({
  dueOn,
  today,
  dueSoonDays,
  failed,
}: TrackerStatusInput): TrackerStatus {
  if (!dueOn) {
    return "NOT_TRACKED";
  }
  if (failed) {
    return "FAILED";
  }
  if (today > dueOn) {
    return "OVERDUE";
  }
  if (today === dueOn) {
    return "DUE_TODAY";
  }
  if (daysBetween(today, dueOn) <= dueSoonDays) {
    return "DUE_SOON";
  }
  return "CURRENT";
}

/**
 * Returns true if the tracker status requires immediate action in the Today list (DUE_TODAY or OVERDUE).
 */
export function needsAction(status: TrackerStatus): boolean {
  return status === "DUE_TODAY" || status === "OVERDUE";
}

export const TRACKER_STATUS_LABELS: Record<TrackerStatus, string> = {
  NOT_TRACKED: "Not tracked",
  CURRENT: "Current",
  DUE_SOON: "Due soon",
  DUE_TODAY: "Due today",
  OVERDUE: "Overdue",
  FAILED: "Failed",
};

/**
 * Formats a date string (YYYY-MM-DD) as "Tue 20 Oct", adding the year only if it differs from the reference/today year.
 */
export function formatEquipmentDay(day: string, referenceToday?: string): string {
  const [year] = day.split("-").map(Number);
  const refYear = referenceToday
    ? Number(referenceToday.split("-")[0])
    : new Date().getFullYear();
  const date = dayToDb(day);

  if (year !== refYear) {
    return format(date, "EEE d MMM yyyy");
  }
  return format(date, "EEE d MMM");
}

export type EquipmentTrackerType = "calibration" | "maintenance" | "review";

export interface EquipmentStatusTextOptions {
  type: EquipmentTrackerType;
  status: TrackerStatus;
  dueOn?: string | null;
  failedOn?: string | null;
  today?: string;
}

/**
 * Returns a human-friendly status text for an equipment tracker.
 * Examples:
 * - "Calibrated until Tue 20 Oct"
 * - "Calibration overdue since Tue 20 Oct"
 * - "Calibration failed on Tue 13 Oct"
 * - "Service due Mon 9 Nov"
 * - "Review due Mon 1 Mar 2027"
 */
export function formatEquipmentStatusText({
  type,
  status,
  dueOn,
  failedOn,
  today,
}: EquipmentStatusTextOptions): string {
  if (status === "NOT_TRACKED") {
    return "Not tracked";
  }

  const formattedDue = dueOn ? formatEquipmentDay(dueOn, today) : "";
  const formattedFailed = failedOn ? formatEquipmentDay(failedOn, today) : "";

  if (type === "calibration") {
    if (status === "FAILED") {
      return formattedFailed ? `Calibration failed on ${formattedFailed}` : "Calibration failed";
    }
    if (status === "OVERDUE") {
      return `Calibration overdue since ${formattedDue}`;
    }
    if (status === "DUE_TODAY") {
      return `Calibration due today`;
    }
    return `Calibrated until ${formattedDue}`;
  }

  if (type === "maintenance") {
    if (status === "OVERDUE") {
      return `Service overdue since ${formattedDue}`;
    }
    if (status === "DUE_TODAY") {
      return `Service due today`;
    }
    return `Service due ${formattedDue}`;
  }

  if (type === "review") {
    if (status === "OVERDUE") {
      return `Review overdue since ${formattedDue}`;
    }
    return `Review due ${formattedDue}`;
  }

  return formattedDue ? `Due ${formattedDue}` : TRACKER_STATUS_LABELS[status];
}
