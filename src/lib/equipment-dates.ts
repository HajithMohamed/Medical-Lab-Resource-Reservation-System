/**
 * Pure date helpers for equipment care schedules and records.
 * Operating exclusively on "YYYY-MM-DD" strings and UTC Date representations.
 * Never uses new Date("YYYY-MM-DD") which parses in local time.
 * Client and server safe (no "server-only").
 */

/**
 * Validates whether a string is a valid "YYYY-MM-DD" calendar date.
 */
export function isValidDay(text?: string | null): boolean {
  if (!text || typeof text !== "string") {
    return false;
  }
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1900 || year > 2200 || month < 1 || month > 12) {
    return false;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth;
}

/**
 * Converts a "YYYY-MM-DD" string to a Date at 00:00:00 UTC (how Prisma stores @db.Date).
 */
export function dayToDb(day: string): Date {
  const [year, month, dayNumber] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, dayNumber, 0, 0, 0, 0));
}

/**
 * Converts a Date (or Date returned by Prisma for @db.Date) into a "YYYY-MM-DD" string.
 */
export function dbToDay(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Adds n calendar days to a "YYYY-MM-DD" string, returning a new "YYYY-MM-DD" string.
 */
export function addDaysToDay(day: string, n: number): string {
  const date = dayToDb(day);
  date.setUTCDate(date.getUTCDate() + n);
  return dbToDay(date);
}

/**
 * Adds n years to a "YYYY-MM-DD" string.
 * Handles leap years: 29 Feb -> 28 Feb in non-leap target years.
 */
export function addYearsToDay(day: string, n: number): string {
  const [year, month, dayNumber] = day.split("-").map(Number);
  const targetYear = year + n;
  let targetDay = dayNumber;

  if (month === 2 && dayNumber === 29) {
    const isLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0;
    if (!isLeap) {
      targetDay = 28;
    }
  }

  const mStr = String(month).padStart(2, "0");
  const dStr = String(targetDay).padStart(2, "0");
  return `${targetYear}-${mStr}-${dStr}`;
}

/**
 * Returns the number of calendar days from fromDay to toDay.
 * Positive if toDay is after fromDay, negative if before.
 */
export function daysBetween(fromDay: string, toDay: string): number {
  const fromMs = dayToDb(fromDay).getTime();
  const toMs = dayToDb(toDay).getTime();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((toMs - fromMs) / MS_PER_DAY);
}

/**
 * Returns today's date formatted as YYYY-MM-DD in client/server local time.
 */
export function todayDay(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
