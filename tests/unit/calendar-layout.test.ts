import { describe, expect, it } from "vitest";
import { rowsPerDay, placeOnDay, rowLabel } from "@/lib/calendar-layout";

describe("Calendar Layout Math (Pure Functions)", () => {
  const dayStart = new Date("2026-10-13T00:00:00.000Z");
  const dayEnd = new Date("2026-10-14T00:00:00.000Z");
  const rowMinutes = 30; // 30-minute rows (48 rows/day)

  describe("rowsPerDay", () => {
    it("computes 48 rows for 30-minute slots", () => {
      expect(rowsPerDay(30)).toBe(48);
    });

    it("computes 96 rows for 15-minute slots", () => {
      expect(rowsPerDay(15)).toBe(96);
    });

    it("computes 24 rows for 60-minute slots", () => {
      expect(rowsPerDay(60)).toBe(24);
    });
  });

  describe("placeOnDay", () => {
    it("places a normal booking within the day", () => {
      // 09:00 to 11:30 (5 rows: 09:00, 09:30, 10:00, 10:30, 11:00)
      const startAt = new Date("2026-10-13T09:00:00.000Z");
      const endAt = new Date("2026-10-13T11:30:00.000Z");

      const placement = placeOnDay({ startAt, endAt, dayStart, dayEnd, rowMinutes });

      expect(placement).toEqual({
        startRow: 18, // 9 hours * 2 rows/hour = 18
        rowSpan: 5, // 2.5 hours * 2 rows/hour = 5
      });
    });

    it("clips a booking that started the day before at the top", () => {
      // Started previous day at 22:00, ends today at 04:00
      const startAt = new Date("2026-10-12T22:00:00.000Z");
      const endAt = new Date("2026-10-13T04:00:00.000Z");

      const placement = placeOnDay({ startAt, endAt, dayStart, dayEnd, rowMinutes });

      expect(placement).toEqual({
        startRow: 0, // clipped to 00:00 (start of day)
        rowSpan: 8, // 00:00 to 04:00 = 4 hours = 8 rows
      });
    });

    it("shows an overnight run on both days, cut at midnight", () => {
      // Overnight: 2026-10-13 22:00 to 2026-10-14 06:00
      const startAt = new Date("2026-10-13T22:00:00.000Z");
      const endAt = new Date("2026-10-14T06:00:00.000Z");

      // Day 1 (2026-10-13): 22:00 to 24:00
      const placementDay1 = placeOnDay({ startAt, endAt, dayStart, dayEnd, rowMinutes });
      expect(placementDay1).toEqual({
        startRow: 44, // 22 hours = 44 rows
        rowSpan: 4, // 22:00 to 24:00 = 2 hours = 4 rows
      });

      // Day 2 (2026-10-14): 00:00 to 06:00
      const day2Start = new Date("2026-10-14T00:00:00.000Z");
      const day2End = new Date("2026-10-15T00:00:00.000Z");
      const placementDay2 = placeOnDay({
        startAt,
        endAt,
        dayStart: day2Start,
        dayEnd: day2End,
        rowMinutes,
      });

      expect(placementDay2).toEqual({
        startRow: 0, // starts at midnight on day 2
        rowSpan: 12, // 00:00 to 06:00 = 6 hours = 12 rows
      });
    });

    it("handles a booking ending exactly at midnight", () => {
      // 20:00 to 24:00 (end of day 2026-10-13)
      const startAt = new Date("2026-10-13T20:00:00.000Z");
      const endAt = new Date("2026-10-14T00:00:00.000Z");

      const placement = placeOnDay({ startAt, endAt, dayStart, dayEnd, rowMinutes });

      expect(placement).toEqual({
        startRow: 40, // 20 hours = 40 rows
        rowSpan: 8, // 4 hours = 8 rows
      });

      // On next day, endAt <= nextDayStart, so it returns null
      const nextDayStart = new Date("2026-10-14T00:00:00.000Z");
      const nextDayEnd = new Date("2026-10-15T00:00:00.000Z");
      const nextDayPlacement = placeOnDay({
        startAt,
        endAt,
        dayStart: nextDayStart,
        dayEnd: nextDayEnd,
        rowMinutes,
      });

      expect(nextDayPlacement).toBeNull();
    });

    it("returns null for a booking outside the day", () => {
      // Entirely before dayStart
      const beforeDay = placeOnDay({
        startAt: new Date("2026-10-12T10:00:00.000Z"),
        endAt: new Date("2026-10-12T12:00:00.000Z"),
        dayStart,
        dayEnd,
        rowMinutes,
      });
      expect(beforeDay).toBeNull();

      // Entirely after dayEnd
      const afterDay = placeOnDay({
        startAt: new Date("2026-10-14T10:00:00.000Z"),
        endAt: new Date("2026-10-14T12:00:00.000Z"),
        dayStart,
        dayEnd,
        rowMinutes,
      });
      expect(afterDay).toBeNull();
    });

    it("rounds start down and end up when not aligned to row boundaries", () => {
      // 10:10 to 11:40 (starts at 10.16h, ends at 11.66h)
      const startAt = new Date("2026-10-13T10:10:00.000Z");
      const endAt = new Date("2026-10-13T11:40:00.000Z");

      const placement = placeOnDay({ startAt, endAt, dayStart, dayEnd, rowMinutes });

      expect(placement).toEqual({
        startRow: 20, // floor(10:10) -> 10:00 (row 20)
        rowSpan: 4, // ceil(11:40) -> 12:00 (row 24) => 24 - 20 = 4 rows
      });
    });
  });

  describe("rowLabel", () => {
    it("returns HH:00 on full hours and empty string otherwise", () => {
      expect(rowLabel(0, 30)).toBe("00:00");
      expect(rowLabel(1, 30)).toBe("");
      expect(rowLabel(2, 30)).toBe("01:00");
      expect(rowLabel(14, 30)).toBe("07:00");
      expect(rowLabel(15, 30)).toBe("");
      expect(rowLabel(20, 30)).toBe("10:00");
      expect(rowLabel(46, 30)).toBe("23:00");
      expect(rowLabel(47, 30)).toBe("");
    });
  });
});
