import { describe, expect, it } from "vitest";
import { navItemsFor, NAV_ITEMS } from "@/config/navigation";

describe("Navigation configuration", () => {
  it("navItemsFor returns exactly 3 items for STAFF", () => {
    const items = navItemsFor("STAFF");
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.href)).toEqual(["/calendar", "/resources", "/bookings"]);
    expect(items.every((i) => i.group === "main")).toBe(true);
  });

  it("navItemsFor returns exactly 6 items for MANAGER", () => {
    const items = navItemsFor("MANAGER");
    expect(items).toHaveLength(6);
    expect(items.map((i) => i.href)).toEqual([
      "/calendar",
      "/resources",
      "/bookings",
      "/maintenance",
      "/usage",
      "/users",
    ]);
  });

  it("navItemsFor returns all 7 items for ADMIN", () => {
    const items = navItemsFor("ADMIN");
    expect(items).toHaveLength(7);
    expect(items.map((i) => i.href)).toEqual([
      "/calendar",
      "/resources",
      "/bookings",
      "/maintenance",
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
