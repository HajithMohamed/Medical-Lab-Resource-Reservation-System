import { describe, expect, it } from "vitest";
import { TZDate } from "@date-fns/tz";
import {
  overlapMinutes,
  standardWindows,
  standardMinutes,
  bookedStandardMinutes,
  utilisationPercent,
  minutesByHourOfDay,
  minutesBySection,
  classify,
} from "@/lib/usage";

const ZONE = "Asia/Colombo";

function makeDate(
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
): Date {
  return new TZDate(year, month - 1, day, hour, minute, 0, 0, ZONE);
}

describe("src/lib/usage.ts pure calculations", () => {
  describe("overlapMinutes", () => {
    it("returns 0 when intervals do not overlap or touch edges", () => {
      const aStart = makeDate(2026, 10, 15, 10, 0);
      const aEnd = makeDate(2026, 10, 15, 11, 0);
      const bStart = makeDate(2026, 10, 15, 11, 0);
      const bEnd = makeDate(2026, 10, 15, 12, 0);

      expect(overlapMinutes(aStart, aEnd, bStart, bEnd)).toBe(0);

      const distantStart = makeDate(2026, 10, 15, 14, 0);
      const distantEnd = makeDate(2026, 10, 15, 15, 0);
      expect(overlapMinutes(aStart, aEnd, distantStart, distantEnd)).toBe(0);
    });

    it("calculates exact intersection for partial and contained overlaps", () => {
      const aStart = makeDate(2026, 10, 15, 10, 0);
      const aEnd = makeDate(2026, 10, 15, 12, 0);

      // Overlap from 11:00 to 12:00 = 60 mins
      const bStart = makeDate(2026, 10, 15, 11, 0);
      const bEnd = makeDate(2026, 10, 15, 13, 0);
      expect(overlapMinutes(aStart, aEnd, bStart, bEnd)).toBe(60);

      // Fully contained from 10:30 to 11:15 = 45 mins
      const cStart = makeDate(2026, 10, 15, 10, 30);
      const cEnd = makeDate(2026, 10, 15, 11, 15);
      expect(overlapMinutes(aStart, aEnd, cStart, cEnd)).toBe(45);
    });
  });

  describe("standardWindows & standardMinutes", () => {
    it("generates 10-hour windows (08:00 to 18:00) on weekdays only and skips weekends", () => {
      // 2026-10-16 is Friday, 2026-10-17 is Saturday, 2026-10-18 is Sunday, 2026-10-19 is Monday
      const from = makeDate(2026, 10, 16, 0, 0);
      const to = makeDate(2026, 10, 20, 0, 0); // Friday 00:00 to Tuesday 00:00 (Fri, Sat, Sun, Mon)

      const windows = standardWindows(from, to, ZONE);
      // Only Friday and Monday are standard weekdays
      expect(windows).toHaveLength(2);

      // Friday window: 08:00 to 18:00 (10 hours = 600 mins)
      expect(windows[0].start.getTime()).toBe(makeDate(2026, 10, 16, 8, 0).getTime());
      expect(windows[0].end.getTime()).toBe(makeDate(2026, 10, 16, 18, 0).getTime());

      // Monday window: 08:00 to 18:00 (10 hours = 600 mins)
      expect(windows[1].start.getTime()).toBe(makeDate(2026, 10, 19, 8, 0).getTime());
      expect(windows[1].end.getTime()).toBe(makeDate(2026, 10, 19, 18, 0).getTime());

      expect(standardMinutes(windows)).toBe(1200); // 20 hours
    });

    it("correctly clips windows when period boundaries fall during standard hours", () => {
      // Wednesday 10:30 to Thursday 14:00 (2026-10-14 to 2026-10-15)
      const from = makeDate(2026, 10, 14, 10, 30);
      const to = makeDate(2026, 10, 15, 14, 0);

      const windows = standardWindows(from, to, ZONE);
      expect(windows).toHaveLength(2);

      // Day 1: 10:30 to 18:00 = 7.5 hours = 450 mins
      expect(windows[0].start.getTime()).toBe(makeDate(2026, 10, 14, 10, 30).getTime());
      expect(windows[0].end.getTime()).toBe(makeDate(2026, 10, 14, 18, 0).getTime());

      // Day 2: 08:00 to 14:00 = 6 hours = 360 mins
      expect(windows[1].start.getTime()).toBe(makeDate(2026, 10, 15, 8, 0).getTime());
      expect(windows[1].end.getTime()).toBe(makeDate(2026, 10, 15, 14, 0).getTime());

      expect(standardMinutes(windows)).toBe(810);
    });
  });

  describe("bookedStandardMinutes", () => {
    it("counts only the portion of an overnight booking that falls inside standard hours", () => {
      // One full standard day: Wednesday 2026-10-14
      const from = makeDate(2026, 10, 14, 0, 0);
      const to = makeDate(2026, 10, 15, 0, 0);
      const windows = standardWindows(from, to, ZONE);

      // Overnight booking from Tuesday 22:00 to Wednesday 11:00
      const reservations = [
        {
          startAt: makeDate(2026, 10, 13, 22, 0),
          endAt: makeDate(2026, 10, 14, 11, 0),
        },
      ];

      // On Wednesday, standard hours start at 08:00. The portion inside is 08:00 to 11:00 = 3 hours = 180 mins.
      const bookedMins = bookedStandardMinutes(reservations, windows);
      expect(bookedMins).toBe(180);
    });

    it("completely excludes weekend bookings", () => {
      const from = makeDate(2026, 10, 16, 0, 0);
      const to = makeDate(2026, 10, 19, 0, 0);
      const windows = standardWindows(from, to, ZONE);

      // Booking on Saturday (2026-10-17) 10:00 to 16:00
      const reservations = [
        {
          startAt: makeDate(2026, 10, 17, 10, 0),
          endAt: makeDate(2026, 10, 17, 16, 0),
        },
      ];

      expect(bookedStandardMinutes(reservations, windows)).toBe(0);
    });

    it("clips bookings crossing period edges", () => {
      // Window is Friday 08:00 to 14:00 (period ends at 14:00)
      const from = makeDate(2026, 10, 16, 8, 0);
      const to = makeDate(2026, 10, 16, 14, 0);
      const windows = standardWindows(from, to, ZONE);

      // Booking running from 12:00 to 17:00 (crosses period end at 14:00)
      const reservations = [
        {
          startAt: makeDate(2026, 10, 16, 12, 0),
          endAt: makeDate(2026, 10, 16, 17, 0),
        },
      ];

      // Overlap with window (08:00-14:00) is 12:00-14:00 = 120 mins
      expect(bookedStandardMinutes(reservations, windows)).toBe(120);
    });
  });

  describe("utilisationPercent", () => {
    it("returns 0 when available is 0 or non-positive", () => {
      expect(utilisationPercent(100, 0)).toBe(0);
      expect(utilisationPercent(100, -50)).toBe(0);
      expect(utilisationPercent(0, 100)).toBe(0);
    });

    it("formats to one decimal place correctly", () => {
      // 120 / 300 = 40.0%
      expect(utilisationPercent(120, 300)).toBe(40.0);

      // 1 / 3 = 33.3333% -> 33.3%
      expect(utilisationPercent(1, 3)).toBe(33.3);

      // 2 / 3 = 66.6666% -> 66.7%
      expect(utilisationPercent(2, 3)).toBe(66.7);
    });
  });

  describe("minutesByHourOfDay", () => {
    it("returns 24 values allocating minutes to the correct hourly slots", () => {
      const from = makeDate(2026, 10, 15, 0, 0);
      const to = makeDate(2026, 10, 16, 0, 0);

      // Booking from 09:15 to 11:45
      // Hour 9 (09:00-10:00): 45 mins (09:15-10:00)
      // Hour 10 (10:00-11:00): 60 mins (10:00-11:00)
      // Hour 11 (11:00-12:00): 45 mins (11:00-11:45)
      const reservations = [
        {
          startAt: makeDate(2026, 10, 15, 9, 15),
          endAt: makeDate(2026, 10, 15, 11, 45),
        },
      ];

      const hourly = minutesByHourOfDay(reservations, from, to, ZONE);
      expect(hourly).toHaveLength(24);
      expect(hourly[9]).toBe(45);
      expect(hourly[10]).toBe(60);
      expect(hourly[11]).toBe(45);
      expect(hourly[8]).toBe(0);
      expect(hourly[12]).toBe(0);
    });
  });

  describe("minutesBySection", () => {
    it("aggregates booked minutes by section and falls back to 'No section' when absent", () => {
      const reservations = [
        {
          startAt: makeDate(2026, 10, 15, 9, 0),
          endAt: makeDate(2026, 10, 15, 11, 0), // 120 mins
          user: { section: { name: "Biochemistry" } },
        },
        {
          startAt: makeDate(2026, 10, 15, 13, 0),
          endAt: makeDate(2026, 10, 15, 16, 0), // 180 mins
          user: { section: { name: "Hematology" } },
        },
        {
          startAt: makeDate(2026, 10, 15, 11, 0),
          endAt: makeDate(2026, 10, 15, 12, 0), // 60 mins
          user: { section: null },
        },
        {
          startAt: makeDate(2026, 10, 15, 16, 0),
          endAt: makeDate(2026, 10, 15, 17, 30), // 90 mins
          user: { section: { name: "Biochemistry" } },
        },
      ];

      const bySection = minutesBySection(reservations);
      // Biochemistry = 120 + 90 = 210 mins
      // Hematology = 180 mins
      // No section = 60 mins
      expect(bySection).toEqual([
        { section: "Biochemistry", minutes: 210 },
        { section: "Hematology", minutes: 180 },
        { section: "No section", minutes: 60 },
      ]);
    });
  });

  describe("classify", () => {
    it("classifies utilisation percentage accurately at thresholds", () => {
      // Busy: >= 70%
      expect(classify(70)).toBe("busy");
      expect(classify(85.5)).toBe("busy");
      expect(classify(100)).toBe("busy");

      // Normal: between 10% and 69.9%
      expect(classify(69.9)).toBe("normal");
      expect(classify(50.0)).toBe("normal");
      expect(classify(10.0)).toBe("normal");

      // Idle: < 10%
      expect(classify(9.9)).toBe("idle");
      expect(classify(5.0)).toBe("idle");
      expect(classify(0)).toBe("idle");
    });
  });
});
