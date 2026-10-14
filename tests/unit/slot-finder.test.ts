import { describe, expect, it } from "vitest";
import { isFree, freeStartTimes, nearestStarts, type TimeRange } from "@/lib/slot-finder";

describe("slot-finder pure helper", () => {
  const d = (timeStr: string) => new Date(`2026-10-20T${timeStr}:00.000Z`);

  describe("isFree", () => {
    it("returns true when busy list is empty", () => {
      expect(isFree([], d("10:00"), d("11:00"))).toBe(true);
    });

    it("back-to-back ranges are free (touching ranges [10:00, 11:00) and [11:00, 12:00) do not clash)", () => {
      const busy: TimeRange[] = [{ start: d("10:00"), end: d("11:00") }];

      // Immediately before: [09:00, 10:00) touches start
      expect(isFree(busy, d("09:00"), d("10:00"))).toBe(true);

      // Immediately after: [11:00, 12:00) touches end
      expect(isFree(busy, d("11:00"), d("12:00"))).toBe(true);
    });

    it("a range strictly inside a busy range clashes", () => {
      const busy: TimeRange[] = [{ start: d("10:00"), end: d("12:00") }];
      expect(isFree(busy, d("10:30"), d("11:30"))).toBe(false);
    });

    it("a range overlapping across the start of a busy range clashes", () => {
      const busy: TimeRange[] = [{ start: d("10:00"), end: d("12:00") }];
      expect(isFree(busy, d("09:30"), d("10:30"))).toBe(false);
    });

    it("a range overlapping across the end of a busy range clashes", () => {
      const busy: TimeRange[] = [{ start: d("10:00"), end: d("12:00") }];
      expect(isFree(busy, d("11:30"), d("12:30"))).toBe(false);
    });

    it("a range completely encompassing a busy range clashes", () => {
      const busy: TimeRange[] = [{ start: d("10:00"), end: d("11:00") }];
      expect(isFree(busy, d("09:00"), d("12:00"))).toBe(false);
    });
  });

  describe("freeStartTimes", () => {
    it("starts before earliest are skipped", () => {
      const dayStart = d("08:00");
      const dayEnd = d("12:00");
      const earliest = d("10:00");
      const busy: TimeRange[] = [];

      const starts = freeStartTimes({
        busy,
        dayStart,
        dayEnd,
        earliest,
        durationMinutes: 60,
        stepMinutes: 30,
      });

      // From 10:00 up to (not including) 12:00 with step 30m: 10:00, 10:30, 11:00, 11:30
      // 08:00, 08:30, 09:00, 09:30 must be skipped
      expect(starts.map((s) => s.toISOString().slice(11, 16))).toEqual([
        "10:00",
        "10:30",
        "11:00",
        "11:30",
      ]);
    });

    it("excludes busy slots and permits back-to-back start times", () => {
      const dayStart = d("08:00");
      const dayEnd = d("12:00");
      const earliest = d("08:00");
      const busy: TimeRange[] = [{ start: d("09:00"), end: d("11:00") }];

      const starts = freeStartTimes({
        busy,
        dayStart,
        dayEnd,
        earliest,
        durationMinutes: 60,
        stepMinutes: 60,
      });

      // 08:00 (ends 09:00) -> free
      // 09:00 (ends 10:00) -> clashes with [09:00, 11:00)
      // 10:00 (ends 11:00) -> clashes with [09:00, 11:00)
      // 11:00 (ends 12:00) -> free (touches 11:00)
      expect(starts.map((s) => s.toISOString().slice(11, 16))).toEqual(["08:00", "11:00"]);
    });

    it("supports overnight duration that ends after midnight", () => {
      const dayStart = d("20:00");
      const dayEnd = d("24:00"); // 2026-10-21T00:00:00Z
      const earliest = d("20:00");
      const busy: TimeRange[] = [
        {
          start: new Date("2026-10-21T03:00:00.000Z"),
          end: new Date("2026-10-21T05:00:00.000Z"),
        },
      ];

      // Duration: 6 hours (360 minutes), step 60m
      const starts = freeStartTimes({
        busy,
        dayStart,
        dayEnd,
        earliest,
        durationMinutes: 360,
        stepMinutes: 60,
      });

      // 20:00 -> ends 02:00 next day (free of 03:00-05:00)
      // 21:00 -> ends 03:00 next day (touches 03:00, free!)
      // 22:00 -> ends 04:00 next day (overlaps 03:00-05:00, busy)
      // 23:00 -> ends 05:00 next day (overlaps 03:00-05:00, busy)
      expect(starts.map((s) => s.toISOString().slice(11, 16))).toEqual(["20:00", "21:00"]);
    });
  });

  describe("nearestStarts", () => {
    it("picks earlier and later times and returns them in time order", () => {
      const candidateStarts = [
        d("08:00"),
        d("09:00"),
        d("09:30"),
        d("10:00"),
        d("11:30"),
        d("12:00"),
        d("14:00"),
      ];
      const wanted = d("10:30");

      // Distances from 10:30:
      // 10:00 -> 30 min
      // 11:30 -> 60 min
      // 09:30 -> 60 min
      // 09:00 -> 90 min
      // 12:00 -> 90 min
      // 08:00 -> 150 min
      // 14:00 -> 210 min
      // Closest 3 are 10:00, 09:30, 11:30
      // Returned in chronological time order: 09:30, 10:00, 11:30
      const nearest = nearestStarts(candidateStarts, wanted, 3);
      expect(nearest.map((s) => s.toISOString().slice(11, 16))).toEqual([
        "09:30",
        "10:00",
        "11:30",
      ]);
    });

    it("returns all candidates when fewer than count are available", () => {
      const candidateStarts = [d("10:00"), d("11:00")];
      const nearest = nearestStarts(candidateStarts, d("10:30"), 5);
      expect(nearest.map((s) => s.toISOString().slice(11, 16))).toEqual(["10:00", "11:00"]);
    });

    it("returns empty array when starts list is empty or count <= 0", () => {
      expect(nearestStarts([], d("10:00"), 3)).toEqual([]);
      expect(nearestStarts([d("10:00")], d("10:00"), 0)).toEqual([]);
    });
  });
});
