import { describe, expect, it } from "vitest";
import { ACTION_DEFINITIONS, type ActionKey } from "@/config/actions";

describe("Action Definitions (v4 Clinical Precision)", () => {
  it("every action definition has a label, an icon, and a valid variant", () => {
    const keys = Object.keys(ACTION_DEFINITIONS) as ActionKey[];
    expect(keys.length).toBeGreaterThanOrEqual(45);

    const validVariants = new Set([
      "primary",
      "secondary",
      "soft",
      "danger",
      "icon",
      "link",
      "menuItem",
    ]);

    for (const key of keys) {
      const def = ACTION_DEFINITIONS[key];
      expect(def).toBeDefined();
      expect(typeof def.label).toBe("string");
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.icon).toBeDefined();
      expect(validVariants.has(def.variant)).toBe(true);
    }
  });
});
