import { SLOT_MINUTES, MAX_CATEGORY_LIMIT_MINUTES } from "@/config/rules";

/**
 * Validates a category maxBookingMinutes limit.
 * Pure function: returns an error message string if invalid, or null if valid.
 *
 * Rules:
 * - Must be an integer (whole number)
 * - Must be at least SLOT_MINUTES (15)
 * - Must be at most MAX_CATEGORY_LIMIT_MINUTES (10080 / 7 days)
 * - Must be a multiple of SLOT_MINUTES (15)
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
