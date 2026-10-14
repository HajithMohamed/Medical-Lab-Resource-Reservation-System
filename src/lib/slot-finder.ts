export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * Returns true when [start, end) overlaps none of the busy ranges.
 * Intervals are half-open [start, end), so back-to-back touching ranges are free.
 */
export function isFree(busy: readonly TimeRange[], start: Date, end: Date): boolean {
  const startMs = start.getTime();
  const endMs = end.getTime();

  if (startMs >= endMs) {
    return false;
  }

  for (const range of busy) {
    const rangeStartMs = range.start.getTime();
    const rangeEndMs = range.end.getTime();

    // Two half-open intervals [A_start, A_end) and [B_start, B_end) overlap iff:
    // A_start < B_end && A_end > B_start
    if (startMs < rangeEndMs && endMs > rangeStartMs) {
      return false;
    }
  }

  return true;
}

export interface FreeStartTimesOptions {
  busy: readonly TimeRange[];
  dayStart: Date;
  dayEnd: Date;
  earliest: Date;
  durationMinutes: number;
  stepMinutes: number;
}

/**
 * Returns every start time from max(dayStart, earliest) up to (not including) dayEnd,
 * aligned to stepMinutes marks, where [start, start + duration) is free.
 * The booking end may pass midnight (overnight runs).
 */
export function freeStartTimes({
  busy,
  dayStart,
  dayEnd,
  earliest,
  durationMinutes,
  stepMinutes,
}: FreeStartTimesOptions): Date[] {
  if (stepMinutes <= 0 || durationMinutes <= 0) {
    return [];
  }

  const stepMs = stepMinutes * 60 * 1000;
  const durationMs = durationMinutes * 60 * 1000;

  const thresholdMs = Math.max(dayStart.getTime(), earliest.getTime());
  const dayEndMs = dayEnd.getTime();

  // Align starting point to stepMinutes marks relative to dayStart
  let currentMs = dayStart.getTime();
  if (currentMs < thresholdMs) {
    const diff = thresholdMs - currentMs;
    const steps = Math.ceil(diff / stepMs);
    currentMs += steps * stepMs;
  }

  const freeStarts: Date[] = [];

  while (currentMs < dayEndMs) {
    const candidateStart = new Date(currentMs);
    const candidateEnd = new Date(currentMs + durationMs);

    if (isFree(busy, candidateStart, candidateEnd)) {
      freeStarts.push(candidateStart);
    }

    currentMs += stepMs;
  }

  return freeStarts;
}

/**
 * Returns the `count` starts closest to the `wanted` start (earlier or later),
 * sorted in time order (ascending chronological order).
 */
export function nearestStarts(starts: readonly Date[], wanted: Date, count: number): Date[] {
  if (count <= 0 || starts.length === 0) {
    return [];
  }

  const wantedMs = wanted.getTime();

  // Stable sort by absolute distance to wantedMs.
  // On equal distance, earlier times come before later times.
  const sortedByDistance = [...starts].sort((a, b) => {
    const distA = Math.abs(a.getTime() - wantedMs);
    const distB = Math.abs(b.getTime() - wantedMs);
    if (distA !== distB) {
      return distA - distB;
    }
    return a.getTime() - b.getTime();
  });

  const selected = sortedByDistance.slice(0, count);

  // Return selected starts in chronological time order
  return selected.sort((a, b) => a.getTime() - b.getTime());
}
