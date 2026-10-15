import { describe, expect, it } from "vitest";
import { navItemsFor, getNavigationForRole, NAV_ITEMS } from "@/config/navigation";

describe("Navigation configuration (v4 Clinical Precision)", () => {
  it("navItemsFor returns exactly 4 items for STAFF in Workspace", () => {
    const items = navItemsFor("STAFF");
    expect(items).toHaveLength(4);
    expect(items.map((i) => i.href)).toEqual(["/calendar", "/book", "/resources", "/bookings"]);
    const groups = getNavigationForRole("STAFF");
    expect(groups).toHaveLength(1);
    expect(groups[0]?.eyebrow).toBe("WORKSPACE");
  });

  it("navItemsFor returns exactly 9 items for MANAGER (Maintenance and Equipment care both present)", () => {
    const items = navItemsFor("MANAGER");
    expect(items).toHaveLength(9);
    expect(items.map((i) => i.href)).toEqual([
      "/calendar",
      "/book",
      "/resources",
      "/bookings",
      "/bookings/manage",
      "/equipment?tab=blocked",
      "/equipment?tab=today",
      "/usage",
      "/users",
    ]);
    const groups = getNavigationForRole("MANAGER", "Colombo");
    expect(groups).toHaveLength(2);
    expect(groups[0]?.eyebrow).toBe("WORKSPACE");
    expect(groups[1]?.eyebrow).toBe("MANAGE COLOMBO SITE");

    const equipCare = items.find((i) => i.label === "Equipment care");
    expect(equipCare?.badge).toBe("dueCount");
  });

  it("navItemsFor returns exactly 8 items for ADMIN across 3 groups", () => {
    const items = navItemsFor("ADMIN");
    expect(items).toHaveLength(8);
    expect(items.map((i) => i.href)).toEqual([
      "/calendar",
      "/resources",
      "/bookings/manage",
      "/equipment?tab=blocked",
      "/equipment?tab=today",
      "/usage",
      "/users",
      "/settings",
    ]);
    const groups = getNavigationForRole("ADMIN");
    expect(groups).toHaveLength(3);
    expect(groups[0]?.eyebrow).toBe("WORKSPACE");
    expect(groups[1]?.eyebrow).toBe("NETWORK");
    expect(groups[2]?.eyebrow).toBe("ADMINISTRATION");
  });

  it("NAV_ITEMS has valid labels and hrefs", () => {
    for (const item of NAV_ITEMS) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.href.startsWith("/")).toBe(true);
      expect(item.roles.length).toBeGreaterThan(0);
    }
  });
});
