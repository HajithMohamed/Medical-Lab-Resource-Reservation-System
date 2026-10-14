import { addDays } from "date-fns";
import {
  SLOT_MINUTES,
  MIN_BOOKING_MINUTES,
  BOOKING_WINDOW_DAYS,
  MAX_CATEGORY_LIMIT_MINUTES,
} from "@/config/rules";
import { isOnSlotBoundary, startOfCurrentSlot } from "@/lib/time";

/**
 * Formats a duration in minutes into full English words (e.g. "4 hours", "1 hour", "45 minutes").
 */
export function formatDurationWords(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) {
    return `${remaining} minute${remaining === 1 ? "" : "s"}`;
  }
  if (remaining === 0) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${hours} hour${hours === 1 ? "" : "s"} ${remaining} minute${remaining === 1 ? "" : "s"}`;
}

/**
 * Validates a category maxBookingMinutes limit.
 * Pure function: returns an error message string if invalid, or null if valid.
 */
export function checkCategoryLimit(minutes: number): string | null {
  if (!Number.isInteger(minutes)) {
    return "Limit must be a whole number of minutes.";
  }

  if (minutes < SLOT_MINUTES) {
    return `Limit must be at least ${SLOT_MINUTES} minutes.`;
  }

  if (minutes > MAX_CATEGORY_LIMIT_MINUTES) {
    return `Limit cannot exceed ${MAX_CATEGORY_LIMIT_MINUTES} minutes.`;
  }

  if (minutes % SLOT_MINUTES !== 0) {
    return `Limit must be a multiple of ${SLOT_MINUTES} minutes.`;
  }

  return null;
}

export interface CheckBookingTimesParams {
  startAt: Date;
  endAt: Date;
  now: Date;
  maxBookingMinutes: number;
  zone?: string;
}

/**
 * Pure validation for booking start and end times.
 * Checks in strict order:
 * 1. start and end on SLOT_MINUTES marks
 * 2. end after start
 * 3. at least MIN_BOOKING_MINUTES
 * 4. at most maxBookingMinutes ("Bookings for this resource can be at most 4 hours.")
 * 5. start not before startOfCurrentSlot(now) ("You can't book a time that has already passed.")
 * 6. start no more than BOOKING_WINDOW_DAYS after now
 */
export function checkBookingTimes({
  startAt,
  endAt,
  now,
  maxBookingMinutes,
  zone,
}: CheckBookingTimesParams): string | null {
  // 1. start and end on SLOT_MINUTES marks
  if (!isOnSlotBoundary(startAt, zone) || !isOnSlotBoundary(endAt, zone)) {
    return "Bookings must start and end on 15-minute marks.";
  }

  // 2. end after start
  if (endAt.getTime() <= startAt.getTime()) {
    return "The end time must be after the start time.";
  }

  // 3. at least MIN_BOOKING_MINUTES
  const durationMinutes = Math.round((endAt.getTime() - startAt.getTime()) / (60 * 1000));
  if (durationMinutes < MIN_BOOKING_MINUTES) {
    return `Bookings must be at least ${MIN_BOOKING_MINUTES} minutes.`;
  }

  // 4. at most maxBookingMinutes
  if (durationMinutes > maxBookingMinutes) {
    return `Bookings for this resource can be at most ${formatDurationWords(maxBookingMinutes)}.`;
  }

  // 5. start not before startOfCurrentSlot(now)
  const currentSlotStart = startOfCurrentSlot(now, zone);
  if (startAt.getTime() < currentSlotStart.getTime()) {
    return "You can't book a time that has already passed.";
  }

  // 6. start no more than BOOKING_WINDOW_DAYS after now
  const maxAllowedStart = addDays(now, BOOKING_WINDOW_DAYS);
  if (startAt.getTime() > maxAllowedStart.getTime()) {
    return `Bookings can be made at most ${BOOKING_WINDOW_DAYS} days in advance.`;
  }

  return null;
}

/**
 * Pure validation for attendees count based on resource capacity:
 * - No capacity -> no attendee count allowed
 * - A capacity -> required, from 1 to the capacity ("This room holds up to 20 people.")
 */
export function checkAttendees(
  capacity: number | null | undefined,
  attendeeCount: number | null | undefined,
): string | null {
  if (!capacity) {
    if (attendeeCount !== undefined && attendeeCount !== null && attendeeCount > 0) {
      return "This resource does not take an attendee count.";
    }
    return null;
  }

  if (
    attendeeCount === undefined ||
    attendeeCount === null ||
    !Number.isInteger(attendeeCount) ||
    attendeeCount < 1 ||
    attendeeCount > capacity
  ) {
    return `This room holds up to ${capacity} people.`;
  }

  return null;
}
