// Plain data configuration for category icons. No React imports.
export const CATEGORY_ICON_KEYS = [
  "molecular",
  "analytical",
  "microscopy",
  "biosafety",
  "sterilisation",
  "room",
  "vehicle",
  "other",
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

export const CATEGORY_ICON_LABELS: Record<CategoryIconKey, string> = {
  molecular: "Molecular",
  analytical: "Analytical",
  microscopy: "Microscopy",
  biosafety: "Biosafety",
  sterilisation: "Sterilisation",
  room: "Room",
  vehicle: "Vehicle",
  other: "Other",
};
