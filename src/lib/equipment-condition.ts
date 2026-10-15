import { REPLACEMENT_REVIEW_REPAIRS } from "@/config/rules";
import { addYearsToDay } from "./equipment-dates";
import { formatEquipmentDay, type TrackerStatus } from "./equipment-status";

export type EquipmentCondition = "GOOD" | "WATCH" | "POOR" | "NOT_TRACKED";

export const CONDITION_LABELS: Record<EquipmentCondition, string> = {
  GOOD: "Good",
  WATCH: "Watch",
  POOR: "Poor",
  NOT_TRACKED: "Not tracked",
};

export interface EquipmentConditionInput {
  resourceStatus: string;
  calibrationTrackerStatus: TrackerStatus;
  maintenanceTrackerStatus: TrackerStatus;
  latestCheckOutcome?: string | null;
  failuresInLookback: number;
  repairsInLookback: number;
  inServiceOn?: string | null;
  expectedServiceLifeYears?: number | null;
  today: string;
  nextCalibrationDueOn?: string | null;
  nextMaintenanceDueOn?: string | null;
  hasSchedules?: boolean;
  hasRecords?: boolean;
}

export interface EquipmentConditionResult {
  condition: EquipmentCondition;
  reasons: string[];
}

/**
 * Evaluates the health condition of a piece of equipment based on lab policies.
 * Never produces a percentage score; returns condition and human-readable reasons.
 *
 * Rules:
 * - POOR if any:
 *   - latest check failed
 *   - calibration OVERDUE
 *   - resource OUT_OF_SERVICE
 *   - repairs in lookback >= REPLACEMENT_REVIEW_REPAIRS
 * - WATCH if any:
 *   - calibration or service DUE_SOON or DUE_TODAY
 *   - service OVERDUE
 *   - >= 1 failure or repair in lookback
 *   - past inServiceOn + expectedServiceLifeYears
 * - NOT_TRACKED if no schedules and no records; otherwise GOOD.
 */
export function equipmentCondition(input: EquipmentConditionInput): EquipmentConditionResult {
  const poorReasons: string[] = [];
  const watchReasons: string[] = [];

  // --- POOR Rules ---
  if (input.latestCheckOutcome === "FAIL") {
    poorReasons.push("Latest check failed");
  }

  if (input.calibrationTrackerStatus === "OVERDUE") {
    const overdueText = input.nextCalibrationDueOn
      ? `Calibration overdue since ${formatEquipmentDay(input.nextCalibrationDueOn, input.today)}`
      : "Calibration overdue";
    poorReasons.push(overdueText);
  }

  if (input.resourceStatus === "OUT_OF_SERVICE") {
    poorReasons.push("Resource is out of service");
  }

  if (input.repairsInLookback >= REPLACEMENT_REVIEW_REPAIRS) {
    poorReasons.push(`${input.repairsInLookback} repairs in the last 12 months`);
  }

  // --- WATCH Rules ---
  if (input.calibrationTrackerStatus === "DUE_TODAY") {
    watchReasons.push("Calibration due today");
  } else if (input.calibrationTrackerStatus === "DUE_SOON") {
    const dueText = input.nextCalibrationDueOn
      ? `Calibration due soon (${formatEquipmentDay(input.nextCalibrationDueOn, input.today)})`
      : "Calibration due soon";
    watchReasons.push(dueText);
  }

  if (input.maintenanceTrackerStatus === "DUE_TODAY") {
    watchReasons.push("Service due today");
  } else if (input.maintenanceTrackerStatus === "DUE_SOON") {
    const dueText = input.nextMaintenanceDueOn
      ? `Service due soon (${formatEquipmentDay(input.nextMaintenanceDueOn, input.today)})`
      : "Service due soon";
    watchReasons.push(dueText);
  }

  if (input.maintenanceTrackerStatus === "OVERDUE") {
    const overdueText = input.nextMaintenanceDueOn
      ? `Service overdue since ${formatEquipmentDay(input.nextMaintenanceDueOn, input.today)}`
      : "Service overdue";
    watchReasons.push(overdueText);
  }

  if (input.failuresInLookback >= 1) {
    const noun = input.failuresInLookback === 1 ? "failure" : "failures";
    watchReasons.push(`${input.failuresInLookback} ${noun} in the last 12 months`);
  }

  if (input.repairsInLookback >= 1 && input.repairsInLookback < REPLACEMENT_REVIEW_REPAIRS) {
    const noun = input.repairsInLookback === 1 ? "repair" : "repairs";
    watchReasons.push(`${input.repairsInLookback} ${noun} in the last 12 months`);
  }

  if (
    input.inServiceOn &&
    input.expectedServiceLifeYears != null &&
    input.expectedServiceLifeYears > 0
  ) {
    const endOfLife = addYearsToDay(input.inServiceOn, input.expectedServiceLifeYears);
    if (input.today > endOfLife) {
      const unit = input.expectedServiceLifeYears === 1 ? "year" : "years";
      watchReasons.push(`Past expected service life of ${input.expectedServiceLifeYears} ${unit}`);
    }
  }

  if (poorReasons.length > 0) {
    return {
      condition: "POOR",
      reasons: [...poorReasons, ...watchReasons],
    };
  }

  if (watchReasons.length > 0) {
    return {
      condition: "WATCH",
      reasons: watchReasons,
    };
  }

  const noSchedules =
    input.hasSchedules === false ||
    (input.hasSchedules === undefined &&
      input.calibrationTrackerStatus === "NOT_TRACKED" &&
      input.maintenanceTrackerStatus === "NOT_TRACKED");

  const noRecords =
    input.hasRecords === false ||
    (input.hasRecords === undefined &&
      !input.latestCheckOutcome &&
      input.failuresInLookback === 0 &&
      input.repairsInLookback === 0);

  if (noSchedules && noRecords) {
    return {
      condition: "NOT_TRACKED",
      reasons: [],
    };
  }

  return {
    condition: "GOOD",
    reasons: [],
  };
}
