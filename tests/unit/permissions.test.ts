import { describe, expect, it } from "vitest";
import { canManageSite, isAdmin, isManagerOrAdmin } from "@/lib/permissions";

describe("Permissions helpers", () => {
  const siteA = "11111111-1111-1111-1111-111111111111";
  const siteB = "22222222-2222-2222-2222-222222222222";

  it("canManageSite allows an ADMIN to manage any site", () => {
    const admin = { role: "ADMIN", siteId: null };
    expect(canManageSite(admin, siteA)).toBe(true);
    expect(canManageSite(admin, siteB)).toBe(true);
    expect(canManageSite(admin, null)).toBe(true);
  });

  it("canManageSite allows a MANAGER to manage their own site only", () => {
    const managerA = { role: "MANAGER", siteId: siteA };
    expect(canManageSite(managerA, siteA)).toBe(true);
    expect(canManageSite(managerA, siteB)).toBe(false);
    expect(canManageSite(managerA, null)).toBe(false);
  });

  it("canManageSite refuses a STAFF user for any site", () => {
    const staff = { role: "STAFF", siteId: siteA };
    expect(canManageSite(staff, siteA)).toBe(false);
    expect(canManageSite(staff, siteB)).toBe(false);
  });

  it("isAdmin returns true only for ADMIN", () => {
    expect(isAdmin({ role: "ADMIN" })).toBe(true);
    expect(isAdmin({ role: "MANAGER" })).toBe(false);
    expect(isAdmin({ role: "STAFF" })).toBe(false);
  });

  it("isManagerOrAdmin returns true for MANAGER and ADMIN, and false for STAFF", () => {
    expect(isManagerOrAdmin({ role: "ADMIN" })).toBe(true);
    expect(isManagerOrAdmin({ role: "MANAGER" })).toBe(true);
    expect(isManagerOrAdmin({ role: "STAFF" })).toBe(false);
  });
});
