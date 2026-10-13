import { describe, it, expect } from "vitest";
import {
  parseLabDateTime,
  labDateString,
  labTimeString,
  formatLabDate,
  formatLabTime,
  formatLabRange,
  formatTimeRange,
  formatRelative,
  labDayStart,
  addLabDays,
  isOnSlotBoundary,
  startOfCurrentSlot,
  ceilToSlot,
} from "@/lib/time";

describe("Time Helpers (Unit)", () => {
  const colomboZone = "Asia/Colombo";
  const londonZone = "Europe/London";

  describe("parseLabDateTime and time conversions", () => {
    it("parses 10:00 in Asia/Colombo as 04:30 UTC", () => {
      const date = parseLabDateTime("2026-10-13", "10:00", colomboZone);
      // 10:00 in Colombo (UTC+5:30) is 04:30 UTC
      expect(new Date(date.getTime()).toISOString()).toBe("2026-10-13T04:30:00.000Z");

      // And converts back to 10:00 Colombo
      expect(labTimeString(date, colomboZone)).toBe("10:00");
      expect(labDateString(date, colomboZone)).toBe("2026-10-13");
    });

    it("handles Europe/London daylight savings correctly after clock change", () => {
      // In summer (e.g. July), London is BST (UTC+1)
      const summerDate = parseLabDateTime("2026-07-15", "10:00", londonZone);
      expect(new Date(summerDate.getTime()).toISOString()).toBe("2026-07-15T09:00:00.000Z");

      // In winter after clock changes (e.g. November), London is GMT (UTC+0)
      const winterDate = parseLabDateTime("2026-11-15", "10:00", londonZone);
      expect(new Date(winterDate.getTime()).toISOString()).toBe("2026-11-15T10:00:00.000Z");

      expect(labTimeString(winterDate, londonZone)).toBe("10:00");
      expect(labDateString(winterDate, londonZone)).toBe("2026-11-15");
    });
  });

  describe("Formatting helpers", () => {
    it("formats dates and times correctly", () => {
      const date = parseLabDateTime("2026-10-13", "10:00", colomboZone);
      expect(formatLabDate(date, colomboZone)).toBe("Tue 13 Oct 2026");
      expect(formatLabTime(date, colomboZone)).toBe("10:00");
    });

    it("formats same-day range correctly", () => {
      const start = parseLabDateTime("2026-10-13", "10:00", colomboZone);
      const end = parseLabDateTime("2026-10-13", "12:00", colomboZone);

      expect(formatLabRange(start, end, colomboZone)).toBe("Tue 13 Oct, 10:00 to 12:00");
      expect(formatTimeRange(start, end, colomboZone)).toBe("10:00 to 12:00");
    });

    it("formats overnight range across days", () => {
      const start = parseLabDateTime("2026-10-13", "22:00", colomboZone);
      const end = parseLabDateTime("2026-10-14", "06:00", colomboZone);

      expect(formatLabRange(start, end, colomboZone)).toBe(
        "Tue 13 Oct, 22:00 to Wed 14 Oct, 06:00",
      );
      expect(formatTimeRange(start, end, colomboZone)).toBe("22:00 to 06:00");
    });

    it("formats relative time correctly", () => {
      const now = new Date("2026-10-13T10:00:00Z");
      const twoDaysAgo = new Date("2026-10-11T10:00:00Z");

      expect(formatRelative(twoDaysAgo, now)).toBe("2 days ago");
      expect(formatRelative(null, now)).toBe("Never");
    });
  });

  describe("Day calculations and slot boundaries", () => {
    it("calculates labDayStart and addLabDays", () => {
      const startOfDay = labDayStart("2026-10-13", colomboZone);
      expect(labTimeString(startOfDay, colomboZone)).toBe("00:00");
      expect(labDateString(startOfDay, colomboZone)).toBe("2026-10-13");

      expect(addLabDays("2026-10-13", 1, colomboZone)).toBe("2026-10-14");
      expect(addLabDays("2026-10-31", 1, colomboZone)).toBe("2026-11-01");
    });

    it("checks slot boundaries correctly", () => {
      const onSlot = parseLabDateTime("2026-10-13", "10:15", colomboZone);
      expect(isOnSlotBoundary(onSlot, colomboZone)).toBe(true);

      const offSlot = new Date(onSlot.getTime() + 1000 * 60 * 3); // 10:18
      expect(isOnSlotBoundary(offSlot, colomboZone)).toBe(false);
    });

    it("calculates startOfCurrentSlot and ceilToSlot", () => {
      const time1018 = parseLabDateTime("2026-10-13", "10:18", colomboZone);

      const floored = startOfCurrentSlot(time1018, colomboZone);
      expect(labTimeString(floored, colomboZone)).toBe("10:15");

      const ceiled = ceilToSlot(time1018, colomboZone);
      expect(labTimeString(ceiled, colomboZone)).toBe("10:30");

      // Already on boundary remains unchanged
      const time1030 = parseLabDateTime("2026-10-13", "10:30", colomboZone);
      expect(labTimeString(ceilToSlot(time1030, colomboZone), colomboZone)).toBe("10:30");
    });
  });
});
