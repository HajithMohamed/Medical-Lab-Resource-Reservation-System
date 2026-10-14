import { describe, it, expect } from "vitest";
import {
  isValidDay,
  dayToDb,
  dbToDay,
  addDaysToDay,
  addYearsToDay,
  daysBetween,
} from "@/lib/equipment-dates";

describe("Equipment Dates Helpers", () => {
  it("validates day strings correctly", () => {
    expect(isValidDay("2026-10-14")).toBe(true);
    expect(isValidDay("2024-02-29")).toBe(true); // leap year
    expect(isValidDay("2025-02-29")).toBe(false); // non-leap year
    expect(isValidDay("invalid")).toBe(false);
    expect(isValidDay("2026-13-01")).toBe(false);
    expect(isValidDay("2026-00-10")).toBe(false);
    expect(isValidDay("")).toBe(false);
    expect(isValidDay(null)).toBe(false);
  });

  it("converts dayToDb and dbToDay losslessly at UTC 00:00:00", () => {
    const dayStr = "2026-10-20";
    const date = dayToDb(dayStr);
    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(9); // 0-indexed October
    expect(date.getUTCDate()).toBe(20);
    expect(date.getUTCHours()).toBe(0);
    expect(date.getUTCMinutes()).toBe(0);

    expect(dbToDay(date)).toBe(dayStr);
  });

  it("adds days accurately", () => {
    expect(addDaysToDay("2026-10-14", 7)).toBe("2026-10-21");
    expect(addDaysToDay("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysToDay("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("adds years accurately including 29 Feb -> 28 Feb in non-leap target years", () => {
    expect(addYearsToDay("2026-10-14", 1)).toBe("2027-10-14");
    expect(addYearsToDay("2026-10-14", 5)).toBe("2031-10-14");

    // Leap day test: 2024-02-29 + 1 year -> 2025-02-28
    expect(addYearsToDay("2024-02-29", 1)).toBe("2025-02-28");
    // 2024-02-29 + 4 years -> 2028-02-29 (leap to leap)
    expect(addYearsToDay("2024-02-29", 4)).toBe("2028-02-29");
  });

  it("computes daysBetween accurately", () => {
    expect(daysBetween("2026-10-14", "2026-10-20")).toBe(6);
    expect(daysBetween("2026-10-20", "2026-10-14")).toBe(-6);
    expect(daysBetween("2026-10-14", "2026-10-14")).toBe(0);
  });
});
