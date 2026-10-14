/**
 * Pure functions for calendar grid math and placement.
 * Framework-independent and time-zone agnostic (all day bounds are passed in).
 */

export interface PlaceOnDayParams {
  startAt: Date;
  endAt: Date;
  dayStart: Date;
  dayEnd: Date;
  rowMinutes: number;
}

export interface PlacedBlock {
  startRow: number;
  rowSpan: number;
}

/**
 * Total number of rows in a 24-hour lab day.
 * e.g. with 30-minute rows: 24 * 60 / 30 = 48 rows.
 */
export function rowsPerDay(rowMinutes: number): number {
  return (24 * 60) / rowMinutes;
}

/**
 * Calculates the start row (0-indexed from dayStart) and rowSpan for a reservation.
 * Clips to the day interval [dayStart, dayEnd).
 *
 * Rules:
 * - Overnight runs / cross-day bookings cut at midnight (shown on both days).
 * - Start is rounded DOWN to whole rows (Math.floor).
 * - End is rounded UP to whole rows (Math.ceil).
 * - Returns null if the reservation does not overlap [dayStart, dayEnd).
 */
export function placeOnDay(params: PlaceOnDayParams): PlacedBlock | null {
  const { startAt, endAt, dayStart, dayEnd, rowMinutes } = params;

  const startMs = startAt.getTime();
  const endMs = endAt.getTime();
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();

  // If entirely before or at dayStart, or entirely at or after dayEnd, not on this day
  if (endMs <= dayStartMs || startMs >= dayEndMs) {
    return null;
  }

  // Clip to the day interval [dayStart, dayEnd)
  const effectiveStartMs = Math.max(startMs, dayStartMs);
  const effectiveEndMs = Math.min(endMs, dayEndMs);

  if (effectiveStartMs >= effectiveEndMs) {
    return null;
  }

  const rowDurationMs = rowMinutes * 60 * 1000;

  // Round start down to whole rows
  const startRow = Math.floor((effectiveStartMs - dayStartMs) / rowDurationMs);

  // Round end up to whole rows
  const endRow = Math.ceil((effectiveEndMs - dayStartMs) / rowDurationMs);

  const rowSpan = Math.max(1, endRow - startRow);

  return {
    startRow,
    rowSpan,
  };
}

/**
 * Formats the time column label for row index:
 * e.g. "07:00" on full hours, "" otherwise.
 */
export function rowLabel(index: number, rowMinutes: number): string {
  const totalMinutes = index * rowMinutes;
  if (totalMinutes % 60 === 0) {
    const hours = Math.floor(totalMinutes / 60) % 24;
    return `${String(hours).padStart(2, "0")}:00`;
  }
  return "";
}
