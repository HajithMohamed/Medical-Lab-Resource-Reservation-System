/**
 * Formats a duration in minutes into a concise human-readable string.
 * Examples:
 * - 45 -> "45 min"
 * - 60 -> "1 h"
 * - 90 -> "1 h 30 min"
 * - 240 -> "4 h"
 * - 720 -> "12 h"
 */
export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "0 min";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${remainingMinutes} min`;
}
