import { TZDate } from "@date-fns/tz";
import {
  STANDARD_WEEKDAYS,
  STANDARD_DAY_START_HOUR,
  STANDARD_DAY_END_HOUR,
  BUSY_UTILISATION_PERCENT,
  IDLE_UTILISATION_PERCENT,
} from "@/config/rules";

export interface TimeWindow {
  start: Date;
  end: Date;
}

export interface ReservationLike {
  startAt: Date;
  endAt: Date;
  user?: {
    section?: {
      name: string;
    } | null;
  } | null;
  createdBy?: {
    section?: {
      name: string;
    } | null;
  } | null;
}

export interface SectionUsage {
  section: string;
  minutes: number;
}

/**
 * Calculates the overlap in minutes between two time intervals [aStart, aEnd] and [bStart, bEnd].
 */
export function overlapMinutes(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number {
  const start = Math.max(aStart.getTime(), bStart.getTime());
  const end = Math.min(aEnd.getTime(), bEnd.getTime());
  if (end <= start) return 0;
  return Math.floor((end - start) / (60 * 1000));
}

/**
 * Returns the standard working day windows [start, end) within the period [from, to)
 * in the specified time zone.
 * Standard hours are Monday-Friday (STANDARD_WEEKDAYS) from STANDARD_DAY_START_HOUR (08:00)
 * to STANDARD_DAY_END_HOUR (18:00).
 */
export function standardWindows(from: Date, to: Date, timeZone: string): TimeWindow[] {
  if (to <= from) return [];

  const windows: TimeWindow[] = [];
  const fromTz = new TZDate(from, timeZone);
  const toTz = new TZDate(to, timeZone);

  // Start cursor at the beginning of the start day in timeZone
  const cursor = new TZDate(
    fromTz.getFullYear(),
    fromTz.getMonth(),
    fromTz.getDate(),
    0,
    0,
    0,
    0,
    timeZone,
  );
  const endLimit = new TZDate(
    toTz.getFullYear(),
    toTz.getMonth(),
    toTz.getDate(),
    23,
    59,
    59,
    999,
    timeZone,
  );

  while (cursor <= endLimit) {
    const dayOfWeek = cursor.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    if (STANDARD_WEEKDAYS.includes(dayOfWeek)) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();
      const date = cursor.getDate();

      const winStart = new TZDate(year, month, date, STANDARD_DAY_START_HOUR, 0, 0, 0, timeZone);
      const winEnd = new TZDate(year, month, date, STANDARD_DAY_END_HOUR, 0, 0, 0, timeZone);

      const clippedStart = Math.max(winStart.getTime(), from.getTime());
      const clippedEnd = Math.min(winEnd.getTime(), to.getTime());

      if (clippedEnd > clippedStart) {
        windows.push({
          start: new Date(clippedStart),
          end: new Date(clippedEnd),
        });
      }
    }

    // Move to next day
    cursor.setDate(cursor.getDate() + 1);
  }

  return windows;
}

/**
 * Returns the sum of minutes across all standard windows.
 */
export function standardMinutes(windows: TimeWindow[]): number {
  return windows.reduce(
    (total, w) => total + Math.floor((w.end.getTime() - w.start.getTime()) / (60 * 1000)),
    0,
  );
}

/**
 * Returns the total confirmed booked minutes that fall within the given standard windows.
 */
export function bookedStandardMinutes(
  reservations: Array<{ startAt: Date; endAt: Date }>,
  windows: TimeWindow[],
): number {
  let total = 0;
  for (const r of reservations) {
    for (const w of windows) {
      total += overlapMinutes(r.startAt, r.endAt, w.start, w.end);
    }
  }
  return total;
}

/**
 * Computes utilisation percentage to one decimal place.
 * Returns 0 if available minutes is 0 or non-positive.
 */
export function utilisationPercent(booked: number, available: number): number {
  if (available <= 0 || booked <= 0) return 0;
  return Math.round((booked / available) * 1000) / 10;
}

/**
 * Distributes booked minutes across the 24 hours of the day (0-23) in the specified time zone.
 * Only the portion of reservations falling within [from, to) is counted.
 */
export function minutesByHourOfDay(
  reservations: Array<{ startAt: Date; endAt: Date }>,
  from: Date,
  to: Date,
  timeZone: string,
): number[] {
  const result: number[] = new Array(24).fill(0);
  if (to <= from) return result;

  for (const r of reservations) {
    const clipStart = Math.max(r.startAt.getTime(), from.getTime());
    const clipEnd = Math.min(r.endAt.getTime(), to.getTime());
    if (clipEnd <= clipStart) continue;

    const startTz = new TZDate(new Date(clipStart), timeZone);
    const endTz = new TZDate(new Date(clipEnd), timeZone);

    const dayCursor = new TZDate(
      startTz.getFullYear(),
      startTz.getMonth(),
      startTz.getDate(),
      0,
      0,
      0,
      0,
      timeZone,
    );
    const dayLimit = new TZDate(
      endTz.getFullYear(),
      endTz.getMonth(),
      endTz.getDate(),
      23,
      59,
      59,
      999,
      timeZone,
    );

    while (dayCursor <= dayLimit) {
      const year = dayCursor.getFullYear();
      const month = dayCursor.getMonth();
      const date = dayCursor.getDate();

      for (let h = 0; h < 24; h++) {
        const hStart = new TZDate(year, month, date, h, 0, 0, 0, timeZone).getTime();
        const hEnd = new TZDate(year, month, date, h + 1, 0, 0, 0, timeZone).getTime();

        const overlap = Math.max(0, Math.min(clipEnd, hEnd) - Math.max(clipStart, hStart));
        if (overlap > 0) {
          result[h] += Math.floor(overlap / (60 * 1000));
        }
      }

      dayCursor.setDate(dayCursor.getDate() + 1);
    }
  }

  return result;
}

/**
 * Groups booked minutes by the section of the person who booked.
 * Returns an array sorted descending by minutes. Uses "No section" when section is not set.
 */
export function minutesBySection(reservations: ReservationLike[]): SectionUsage[] {
  const map = new Map<string, number>();

  for (const r of reservations) {
    const sectionName =
      (r.createdBy?.section?.name || r.user?.section?.name)?.trim() || "No section";
    const durationMinutes = Math.max(
      0,
      Math.floor((r.endAt.getTime() - r.startAt.getTime()) / (60 * 1000)),
    );

    map.set(sectionName, (map.get(sectionName) || 0) + durationMinutes);
  }

  const items: SectionUsage[] = Array.from(map.entries()).map(([section, minutes]) => ({
    section,
    minutes,
  }));

  items.sort((a, b) => b.minutes - a.minutes || a.section.localeCompare(b.section));
  return items;
}

/**
 * Classifies a utilisation percentage as "busy" (>= 70%), "idle" (< 10%), or "normal".
 */
export function classify(percent: number): "busy" | "idle" | "normal" {
  if (percent >= BUSY_UTILISATION_PERCENT) {
    return "busy";
  }
  if (percent < IDLE_UTILISATION_PERCENT) {
    return "idle";
  }
  return "normal";
}
