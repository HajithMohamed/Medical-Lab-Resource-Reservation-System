import { describe, it, expect } from "vitest";
import { equipmentCondition } from "@/lib/equipment-condition";

describe("equipmentCondition (Pure Unit Tests)", () => {
  const baseInput = {
    resourceStatus: "ACTIVE",
    calibrationTrackerStatus: "CURRENT" as const,
    maintenanceTrackerStatus: "CURRENT" as const,
    latestCheckOutcome: "PASS",
    failuresInLookback: 0,
    repairsInLookback: 0,
    inServiceOn: "2024-01-01",
    expectedServiceLifeYears: 10,
    today: "2026-10-15",
    nextCalibrationDueOn: "2027-01-15",
    nextMaintenanceDueOn: "2027-02-15",
    hasSchedules: true,
    hasRecords: true,
  };

  describe("GOOD Condition", () => {
    it("returns GOOD when active, current trackers, recent pass, and no repairs/failures", () => {
      const result = equipmentCondition(baseInput);
      expect(result.condition).toBe("GOOD");
      expect(result.reasons).toEqual([]);
    });

    it("returns GOOD when only maintenance is tracked and current", () => {
      const result = equipmentCondition({
        ...baseInput,
        calibrationTrackerStatus: "NOT_TRACKED",
        nextCalibrationDueOn: null,
      });
      expect(result.condition).toBe("GOOD");
      expect(result.reasons).toEqual([]);
    });
  });

  describe("NOT_TRACKED Condition", () => {
    it("returns NOT_TRACKED when there are no schedules and no records", () => {
      const result = equipmentCondition({
        ...baseInput,
        calibrationTrackerStatus: "NOT_TRACKED",
        maintenanceTrackerStatus: "NOT_TRACKED",
        latestCheckOutcome: null,
        failuresInLookback: 0,
        repairsInLookback: 0,
        hasSchedules: false,
        hasRecords: false,
      });
      expect(result.condition).toBe("NOT_TRACKED");
      expect(result.reasons).toEqual([]);
    });
  });

  describe("POOR Condition Rules", () => {
    it("rule 1: latest check failed -> POOR", () => {
      const result = equipmentCondition({
        ...baseInput,
        latestCheckOutcome: "FAIL",
      });
      expect(result.condition).toBe("POOR");
      expect(result.reasons).toContain("Latest check failed");
    });

    it("rule 2: calibration OVERDUE -> POOR with date", () => {
      const result = equipmentCondition({
        ...baseInput,
        calibrationTrackerStatus: "OVERDUE",
        nextCalibrationDueOn: "2026-10-13",
      });
      expect(result.condition).toBe("POOR");
      expect(result.reasons).toContain("Calibration overdue since Tue 13 Oct");
    });

    it("rule 3: resource OUT_OF_SERVICE -> POOR", () => {
      const result = equipmentCondition({
        ...baseInput,
        resourceStatus: "OUT_OF_SERVICE",
      });
      expect(result.condition).toBe("POOR");
      expect(result.reasons).toContain("Resource is out of service");
    });

    it("rule 4: repairs in lookback >= 3 (REPLACEMENT_REVIEW_REPAIRS) -> POOR (boundary test)", () => {
      const result3 = equipmentCondition({
        ...baseInput,
        repairsInLookback: 3,
      });
      expect(result3.condition).toBe("POOR");
      expect(result3.reasons).toContain("3 repairs in the last 12 months");

      const result4 = equipmentCondition({
        ...baseInput,
        repairsInLookback: 4,
      });
      expect(result4.condition).toBe("POOR");
      expect(result4.reasons).toContain("4 repairs in the last 12 months");
    });
  });

  describe("WATCH Condition Rules", () => {
    it("rule 1a: calibration DUE_TODAY -> WATCH", () => {
      const result = equipmentCondition({
        ...baseInput,
        calibrationTrackerStatus: "DUE_TODAY",
        nextCalibrationDueOn: "2026-10-15",
      });
      expect(result.condition).toBe("WATCH");
      expect(result.reasons).toContain("Calibration due today");
    });

    it("rule 1b: calibration DUE_SOON -> WATCH with date", () => {
      const result = equipmentCondition({
        ...baseInput,
        calibrationTrackerStatus: "DUE_SOON",
        nextCalibrationDueOn: "2026-10-25",
      });
      expect(result.condition).toBe("WATCH");
      expect(result.reasons).toContain("Calibration due soon (Sun 25 Oct)");
    });

    it("rule 1c: service DUE_TODAY -> WATCH", () => {
      const result = equipmentCondition({
        ...baseInput,
        maintenanceTrackerStatus: "DUE_TODAY",
        nextMaintenanceDueOn: "2026-10-15",
      });
      expect(result.condition).toBe("WATCH");
      expect(result.reasons).toContain("Service due today");
    });

    it("rule 1d: service DUE_SOON -> WATCH with date", () => {
      const result = equipmentCondition({
        ...baseInput,
        maintenanceTrackerStatus: "DUE_SOON",
        nextMaintenanceDueOn: "2026-10-28",
      });
      expect(result.condition).toBe("WATCH");
      expect(result.reasons).toContain("Service due soon (Wed 28 Oct)");
    });

    it("rule 2: service OVERDUE -> WATCH with date", () => {
      const result = equipmentCondition({
        ...baseInput,
        maintenanceTrackerStatus: "OVERDUE",
        nextMaintenanceDueOn: "2026-10-10",
      });
      expect(result.condition).toBe("WATCH");
      expect(result.reasons).toContain("Service overdue since Sat 10 Oct");
    });

    it("rule 3: 1 or 2 repairs in lookback (< 3) -> WATCH (boundary test)", () => {
      const result1 = equipmentCondition({
        ...baseInput,
        repairsInLookback: 1,
      });
      expect(result1.condition).toBe("WATCH");
      expect(result1.reasons).toContain("1 repair in the last 12 months");

      const result2 = equipmentCondition({
        ...baseInput,
        repairsInLookback: 2,
      });
      expect(result2.condition).toBe("WATCH");
      expect(result2.reasons).toContain("2 repairs in the last 12 months");
    });

    it("rule 3: >= 1 failure in lookback -> WATCH", () => {
      const result1 = equipmentCondition({
        ...baseInput,
        failuresInLookback: 1,
      });
      expect(result1.condition).toBe("WATCH");
      expect(result1.reasons).toContain("1 failure in the last 12 months");

      const result2 = equipmentCondition({
        ...baseInput,
        failuresInLookback: 2,
      });
      expect(result2.condition).toBe("WATCH");
      expect(result2.reasons).toContain("2 failures in the last 12 months");
    });

    it("rule 4: past inServiceOn + expectedServiceLifeYears (boundary tests)", () => {
      // In service 2021-10-15 with 5 years -> endOfLife is 2026-10-15
      // Today is 2026-10-15: exactly on the last day -> NOT past
      const onDay = equipmentCondition({
        ...baseInput,
        inServiceOn: "2021-10-15",
        expectedServiceLifeYears: 5,
        today: "2026-10-15",
      });
      expect(onDay.condition).toBe("GOOD");

      // Today is 2026-10-16: 1 day past -> WATCH
      const pastDay = equipmentCondition({
        ...baseInput,
        inServiceOn: "2021-10-15",
        expectedServiceLifeYears: 5,
        today: "2026-10-16",
      });
      expect(pastDay.condition).toBe("WATCH");
      expect(pastDay.reasons).toContain("Past expected service life of 5 years");
    });
  });

  describe("Precedence and Multiple Reasons", () => {
    it("POOR takes precedence over WATCH and includes both poor and watch reasons", () => {
      const result = equipmentCondition({
        ...baseInput,
        calibrationTrackerStatus: "OVERDUE",
        nextCalibrationDueOn: "2026-10-13",
        repairsInLookback: 2,
        maintenanceTrackerStatus: "DUE_SOON",
        nextMaintenanceDueOn: "2026-10-20",
      });
      expect(result.condition).toBe("POOR");
      expect(result.reasons).toContain("Calibration overdue since Tue 13 Oct");
      expect(result.reasons).toContain("2 repairs in the last 12 months");
      expect(result.reasons).toContain("Service due soon (Tue 20 Oct)");
    });
  });
});
