// Plain data configuration for equipment care form parts and labels. No React imports.
// A lab can change this list; the standards leave it to the lab.

export type EquipmentPart = "details" | "calibration" | "maintenance";

/**
 * Returns the equipment form parts applicable for a category based on its icon key.
 * - room: []
 * - vehicle: ["details", "maintenance"]
 * - others: ["details", "calibration", "maintenance"]
 */
export function equipmentPartsFor(iconKey?: string | null): EquipmentPart[] {
  if (!iconKey || iconKey === "room") {
    return [];
  }
  if (iconKey === "vehicle") {
    return ["details", "maintenance"];
  }
  return ["details", "calibration", "maintenance"];
}

export interface EquipmentLabels {
  serialNumber: string;
  maintenance: string;
}

/**
 * Returns category-tailored labels for equipment fields.
 * E.g., for vehicles, "Registration number" and "Vehicle service".
 */
export function equipmentLabelsFor(iconKey?: string | null): EquipmentLabels {
  if (iconKey === "vehicle") {
    return {
      serialNumber: "Registration number",
      maintenance: "Vehicle service",
    };
  }
  return {
    serialNumber: "Serial number",
    maintenance: "Preventive maintenance",
  };
}
