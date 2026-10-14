import { describe, it, expect } from "vitest";
import {
  trackerStatus,
  needsAction,
  formatEquipmentDay,
  formatEquipmentStatusText,
} from "@/lib/equipment-status";

describe("Equipment Status Tracker", () => {
  const today = "2026-10-14";
  const dueSoonDays = 30;

  it("returns NOT_TRACKED when dueOn is empty", () => {
    expect(trackerStatus({ dueOn: null, today, dueSoonDays })).toBe("NOT_TRACKED");
    expect(trackerStatus({ dueOn: undefined, today, dueSoonDays })).toBe("NOT_TRACKED");
  });

  it("returns FAILED when failed is true", () => {
    expect(
      trackerStatus({
        dueOn: "2026-10-20",
        today,
        dueSoonDays,
        failed: true,
      }),
    ).toBe("FAILED");
  });

  it("returns OVERDUE when today is strictly after dueOn", () => {
    expect(
      trackerStatus({
        dueOn: "2026-10-13",
        today,
        dueSoonDays,
      }),
    ).toBe("OVERDUE");
  });

  it("returns DUE_TODAY when today equals dueOn (the due day is NOT overdue)", () => {
    expect(
      trackerStatus({
        dueOn: "2026-10-14",
        today,
        dueSoonDays,
      }),
    ).toBe("DUE_TODAY");
  });

  it("returns DUE_SOON when due within dueSoonDays", () => {
    expect(
      trackerStatus({
        dueOn: "2026-10-20", // 6 days away
        today,
        dueSoonDays,
      }),
    ).toBe("DUE_SOON");
    expect(
      trackerStatus({
        dueOn: "2026-11-13", // 30 days away
        today,
        dueSoonDays: 30,
      }),
    ).toBe("DUE_SOON");
  });

  it("returns CURRENT when due beyond dueSoonDays", () => {
    expect(
      trackerStatus({
        dueOn: "2026-12-01", // > 30 days away
        today,
        dueSoonDays,
      }),
    ).toBe("CURRENT");
  });

  it("correctly identifies tasks needing action in the Today list", () => {
    expect(needsAction("DUE_TODAY")).toBe(true);
    expect(needsAction("OVERDUE")).toBe(true);
    expect(needsAction("CURRENT")).toBe(false);
    expect(needsAction("DUE_SOON")).toBe(false);
    expect(needsAction("FAILED")).toBe(false);
    expect(needsAction("NOT_TRACKED")).toBe(false);
  });

  it("formats dates with year only when differing from today reference year", () => {
    expect(formatEquipmentDay("2026-10-20", "2026-10-14")).toBe("Tue 20 Oct");
    expect(formatEquipmentDay("2027-03-01", "2026-10-14")).toBe("Mon 1 Mar 2027");
  });

  it("formats human-friendly status texts for all trackers", () => {
    expect(
      formatEquipmentStatusText({
        type: "calibration",
        status: "CURRENT",
        dueOn: "2026-10-20",
        today,
      }),
    ).toBe("Calibrated until Tue 20 Oct");

    expect(
      formatEquipmentStatusText({
        type: "calibration",
        status: "OVERDUE",
        dueOn: "2026-10-20",
        today,
      }),
    ).toBe("Calibration overdue since Tue 20 Oct");

    expect(
      formatEquipmentStatusText({
        type: "calibration",
        status: "FAILED",
        failedOn: "2026-10-13",
        today,
      }),
    ).toBe("Calibration failed on Tue 13 Oct");

    expect(
      formatEquipmentStatusText({
        type: "maintenance",
        status: "DUE_SOON",
        dueOn: "2026-11-09",
        today,
      }),
    ).toBe("Service due Mon 9 Nov");

    expect(
      formatEquipmentStatusText({
        type: "review",
        status: "CURRENT",
        dueOn: "2027-03-01",
        today,
      }),
    ).toBe("Review due Mon 1 Mar 2027");
  });
});
