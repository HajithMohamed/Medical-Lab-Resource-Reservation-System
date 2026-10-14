import "server-only";

import { TZDate } from "@date-fns/tz";
import { format, addDays, formatDistance, isSameDay } from "date-fns";
import { env } from "@/lib/env";
import { SLOT_MINUTES } from "@/config/rules";
/**
 * Returns the configured lab time zone.
 */
export function getLabTimeZone(): string {
  return env.APP_TIME_ZONE;
}

/**
 * Parses a lab date string ("2026-10-13") and time string ("10:00") into a Date
 * in the specified time zone.
 * Never uses new Date("YYYY-MM-DDTHH:mm") which would parse in server local time.
 */
export function parseLabDateTime(
  dateStr: string,
  timeStr: string,
  zone: string = env.APP_TIME_ZONE,
): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  return new TZDate(year, month - 1, day, hour, minute, 0, 0, zone);
}

/**
 * Returns the "YYYY-MM-DD" date string in the lab time zone.
 */
export function labDateString(date: Date, zone: string = env.APP_TIME_ZONE): string {
  const tz = new TZDate(date, zone);
  return format(tz, "yyyy-MM-dd");
}

/**
 * Returns the "HH:mm" 24-hour time string in the lab time zone.
 */
export function labTimeString(date: Date, zone: string = env.APP_TIME_ZONE): string {
  const tz = new TZDate(date, zone);
  return format(tz, "HH:mm");
}

/**
 * Returns today's "YYYY-MM-DD" string in the lab time zone.
 */
export function labToday(zone: string = env.APP_TIME_ZONE): string {
  return labDateString(new Date(), zone);
}

/**
 * Formats a Date as "Tue 13 Oct 2026" in the lab time zone.
 */
export function formatLabDate(date: Date, zone: string = env.APP_TIME_ZONE): string {
  const tz = new TZDate(date, zone);
  return format(tz, "EEE d MMM yyyy");
}

/**
 * Formats a Date as "10:00" in the lab time zone.
 */
export function formatLabTime(date: Date, zone: string = env.APP_TIME_ZONE): string {
  const tz = new TZDate(date, zone);
  return format(tz, "HH:mm");
}

/**
 * Formats a range for messages and lists:
 * - Same day: "Tue 13 Oct, 10:00 to 12:00"
 * - Different day: "Tue 13 Oct, 10:00 to Wed 14 Oct, 12:00"
 */
export function formatLabRange(start: Date, end: Date, zone: string = env.APP_TIME_ZONE): string {
  const startTz = new TZDate(start, zone);
  const endTz = new TZDate(end, zone);

  const startTime = format(startTz, "HH:mm");
  const endTime = format(endTz, "HH:mm");

  if (isSameDay(startTz, endTz)) {
    const dayStr = format(startTz, "EEE d MMM");
    return `${dayStr}, ${startTime} to ${endTime}`;
  }

  const startDayStr = format(startTz, "EEE d MMM");
  const endDayStr = format(endTz, "EEE d MMM");
  return `${startDayStr}, ${startTime} to ${endDayStr}, ${endTime}`;
}

/**
 * Formats a time range for calendar blocks: "10:00 to 12:00".
 */
export function formatTimeRange(start: Date, end: Date, zone: string = env.APP_TIME_ZONE): string {
  const startTz = new TZDate(start, zone);
  const endTz = new TZDate(end, zone);
  return `${format(startTz, "HH:mm")} to ${format(endTz, "HH:mm")}`;
}

/**
 * Formats a relative date/time string compared to now: e.g. "2 days ago".
 */
export function formatRelative(date: Date | null | undefined, now: Date = new Date()): string {
  if (!date) {
    return "Never";
  }
  return formatDistance(date, now, { addSuffix: true });
}

/**
 * Returns the Date of 00:00:00 that day in the lab time zone.
 */
export function labDayStart(dateString: string, zone: string = env.APP_TIME_ZONE): Date {
  return parseLabDateTime(dateString, "00:00", zone);
}

/**
 * Returns the Date of 23:59:59.999 that day in the lab time zone.
 */
export function labDayEnd(dateString: string, zone: string = env.APP_TIME_ZONE): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new TZDate(year, month - 1, day, 23, 59, 59, 999, zone);
}

/**
 * Adds n days to a "YYYY-MM-DD" date string in the lab time zone, returning "YYYY-MM-DD".
 */
export function addLabDays(
  dateString: string,
  n: number,
  zone: string = env.APP_TIME_ZONE,
): string {
  const day = labDayStart(dateString, zone);
  const targetDay = addDays(day, n);
  return labDateString(targetDay, zone);
}

/**
 * Returns true if the Date lands exactly on a slot boundary (minutes % SLOT_MINUTES === 0,
 * and seconds and milliseconds are 0).
 */
export function isOnSlotBoundary(date: Date, zone: string = env.APP_TIME_ZONE): boolean {
  const tz = new TZDate(date, zone);
  return (
    tz.getMinutes() % SLOT_MINUTES === 0 && tz.getSeconds() === 0 && tz.getMilliseconds() === 0
  );
}

/**
 * Returns the start of the current slot (floored to previous SLOT_MINUTES mark).
 */
export function startOfCurrentSlot(now: Date = new Date(), zone: string = env.APP_TIME_ZONE): Date {
  const tz = new TZDate(now, zone);
  const currentMinutes = tz.getMinutes();
  const flooredMinutes = Math.floor(currentMinutes / SLOT_MINUTES) * SLOT_MINUTES;

  return new TZDate(
    tz.getFullYear(),
    tz.getMonth(),
    tz.getDate(),
    tz.getHours(),
    flooredMinutes,
    0,
    0,
    zone,
  );
}

/**
 * Rounds up to the next SLOT_MINUTES mark. If already on a slot mark, returns exact time.
 */
export function ceilToSlot(date: Date, zone: string = env.APP_TIME_ZONE): Date {
  const tz = new TZDate(date, zone);
  if (tz.getMinutes() % SLOT_MINUTES === 0 && tz.getSeconds() === 0 && tz.getMilliseconds() === 0) {
    return tz;
  }

  const currentMinutes = tz.getMinutes();
  const nextSlotMinutes = Math.ceil((currentMinutes + 1) / SLOT_MINUTES) * SLOT_MINUTES;

  const result = new TZDate(
    tz.getFullYear(),
    tz.getMonth(),
    tz.getDate(),
    tz.getHours(),
    0,
    0,
    0,
    zone,
  );
  result.setMinutes(nextSlotMinutes);
  return result;
}
