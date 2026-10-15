import { describe, expect, it } from "vitest";
import { navItemsFor, NAV_ITEMS } from "@/config/navigation";

describe("Navigation configuration", () => {
  it("navItemsFor returns exactly 5 items for STAFF", () => {
    const items = navItemsFor("STAFF");
    expect(items).toHaveLength(5);
    expect(items.map((i) => i.href)).toEqual([
      "/calendar",
      "/book",
      "/resources",
      "/bookings",
      "/notifications",
    ]);
    expect(items.every((i) => i.group === "main")).toBe(true);
  });

  it("navItemsFor returns exactly 9 items for MANAGER (no separate maintenance item)", () => {
    const items = navItemsFor("MANAGER");
    expect(items).toHaveLength(9);
    expect(items.map((i) => i.href)).toEqual([
      "/calendar",
      "/book",
      "/resources",
      "/bookings",
      "/notifications",
      "/bookings/manage",
      "/equipment",
      "/usage",
      "/users",
    ]);
    const equipmentItem = items.find((i) => i.href === "/equipment");
    expect(equipmentItem?.label).toBe("Maintenance & care");
    expect(items.some((i) => i.href === "/maintenance")).toBe(false);
  });

  it("navItemsFor returns exactly 8 items for ADMIN (no booking routes, merged maintenance & care)", () => {
    const items = navItemsFor("ADMIN");
    expect(items).toHaveLength(8);
    expect(items.map((i) => i.href)).toEqual([
      "/calendar",
      "/resources",
      "/notifications",
      "/bookings/manage",
      "/equipment",
      "/usage",
      "/users",
      "/settings",
    ]);
    const equipmentItem = items.find((i) => i.href === "/equipment");
    expect(equipmentItem?.label).toBe("Maintenance & care");
    expect(items.some((i) => i.href === "/maintenance")).toBe(false);
  });

  it("NAV_ITEMS has valid labels and hrefs", () => {
    for (const item of NAV_ITEMS) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.href.startsWith("/")).toBe(true);
      expect(item.roles.length).toBeGreaterThan(0);
    }
  });
});
