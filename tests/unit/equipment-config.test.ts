import { describe, it, expect } from "vitest";
import { equipmentPartsFor, equipmentLabelsFor } from "@/config/equipment";

describe("Equipment Configuration", () => {
  it("determines form parts based on category iconKey", () => {
    // room -> []
    expect(equipmentPartsFor("room")).toEqual([]);

    // vehicle -> ["details", "maintenance"]
    expect(equipmentPartsFor("vehicle")).toEqual(["details", "maintenance"]);

    // other categories -> ["details", "calibration", "maintenance"]
    expect(equipmentPartsFor("molecular")).toEqual(["details", "calibration", "maintenance"]);
    expect(equipmentPartsFor("analytical")).toEqual(["details", "calibration", "maintenance"]);
    expect(equipmentPartsFor("microscopy")).toEqual(["details", "calibration", "maintenance"]);
    expect(equipmentPartsFor("biosafety")).toEqual(["details", "calibration", "maintenance"]);
    expect(equipmentPartsFor("sterilisation")).toEqual(["details", "calibration", "maintenance"]);
    expect(equipmentPartsFor("other")).toEqual(["details", "calibration", "maintenance"]);
    expect(equipmentPartsFor(null)).toEqual([]);
    expect(equipmentPartsFor(undefined)).toEqual([]);
  });

  it("tailors labels for vehicles", () => {
    const vehicleLabels = equipmentLabelsFor("vehicle");
    expect(vehicleLabels.serialNumber).toBe("Registration number");
    expect(vehicleLabels.maintenance).toBe("Vehicle service");

    const defaultLabels = equipmentLabelsFor("molecular");
    expect(defaultLabels.serialNumber).toBe("Serial number");
    expect(defaultLabels.maintenance).toBe("Preventive maintenance");
  });
});
