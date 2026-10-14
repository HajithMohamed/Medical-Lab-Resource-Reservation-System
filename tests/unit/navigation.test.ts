import { describe, expect, it } from "vitest";
import { navItemsFor, NAV_ITEMS } from "@/config/navigation";

describe("Navigation configuration", () => {
  it("navItemsFor returns exactly 4 items for STAFF", () => {
    const items = navItemsFor("STAFF");
    expect(items).toHaveLength(4);
    expect(items.map((i) => i.href)).toEqual(["/calendar", "/book", "/resources", "/bookings"]);
    expect(items.every((i) => i.group === "main")).toBe(true);
  });

  it("navItemsFor returns exactly 9 items for MANAGER", () => {
    const items = navItemsFor("MANAGER");
    expect(items).toHaveLength(9);
    expect(items.map((i) => i.href)).toEqual([
      "/calendar",
      "/book",
      "/resources",
      "/bookings",
      "/bookings/manage",
      "/maintenance",
      "/equipment",
      "/usage",
      "/users",
    ]);
  });

  it("navItemsFor returns exactly 8 items for ADMIN (no booking routes)", () => {
    const items = navItemsFor("ADMIN");
    expect(items).toHaveLength(8);
    expect(items.map((i) => i.href)).toEqual([
      "/calendar",
      "/resources",
      "/bookings/manage",
      "/maintenance",
      "/equipment",
      "/usage",
      "/users",
      "/settings",
    ]);
  });

  it("NAV_ITEMS has valid labels and hrefs", () => {
    for (const item of NAV_ITEMS) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.href.startsWith("/")).toBe(true);
      expect(item.roles.length).toBeGreaterThan(0);
    }
  });
});
