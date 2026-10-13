import { describe, expect, it } from "vitest";
import { getCategoryIconName, CATEGORY_ICON_NAME_MAP } from "@/components/category-icon";
import { CATEGORY_ICON_KEYS } from "@/config/category-icons";

describe("Category icon mapping and fallback", () => {
  it("maps all 8 category keys to their respective Lucide icon names", () => {
    const expectedMap: Record<string, string> = {
      molecular: "Dna",
      analytical: "FlaskConical",
      microscopy: "Microscope",
      biosafety: "ShieldCheck",
      sterilisation: "Flame",
      room: "DoorOpen",
      vehicle: "Truck",
      other: "Box",
    };

    for (const key of CATEGORY_ICON_KEYS) {
      expect(getCategoryIconName(key)).toBe(expectedMap[key]);
      expect(CATEGORY_ICON_NAME_MAP[key]).toBe(expectedMap[key]);
    }
  });

  it("falls back to Box for unknown or empty category keys", () => {
    expect(getCategoryIconName("unknown-key")).toBe("Box");
    expect(getCategoryIconName("laser")).toBe("Box");
    expect(getCategoryIconName("")).toBe("Box");
    expect(getCategoryIconName("xyz_random")).toBe("Box");
  });
});
