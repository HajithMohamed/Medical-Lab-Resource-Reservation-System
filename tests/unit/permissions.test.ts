import { describe, expect, it } from "vitest";
import {
  canManageSite,
  isAdmin,
  isManagerOrAdmin,
  rolesActorCanCreate,
  canManageUser,
  canCancelReservation,
} from "@/lib/permissions";

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

  describe("rolesActorCanCreate", () => {
    it("ADMIN can create STAFF, MANAGER, and ADMIN", () => {
      const admin = { role: "ADMIN", siteId: null };
      expect(rolesActorCanCreate(admin)).toEqual(["STAFF", "MANAGER", "ADMIN"]);
    });

    it("MANAGER can create only STAFF", () => {
      const manager = { role: "MANAGER", siteId: siteA };
      expect(rolesActorCanCreate(manager)).toEqual(["STAFF"]);
    });

    it("STAFF cannot create any accounts", () => {
      const staff = { role: "STAFF", siteId: siteA };
      expect(rolesActorCanCreate(staff)).toEqual([]);
    });
  });

  describe("canManageUser", () => {
    const admin = { role: "ADMIN", siteId: null };
    const managerA = { role: "MANAGER", siteId: siteA };
    const managerB = { role: "MANAGER", siteId: siteB };
    const staffA = { role: "STAFF", siteId: siteA };
    const staffB = { role: "STAFF", siteId: siteB };

    it("ADMIN can manage any user", () => {
      expect(canManageUser(admin, admin)).toBe(true);
      expect(canManageUser(admin, managerA)).toBe(true);
      expect(canManageUser(admin, staffA)).toBe(true);
      expect(canManageUser(admin, staffB)).toBe(true);
    });

    it("MANAGER can manage STAFF at their own site only", () => {
      expect(canManageUser(managerA, staffA)).toBe(true);
      expect(canManageUser(managerA, staffB)).toBe(false);
      expect(canManageUser(managerA, managerA)).toBe(false);
      expect(canManageUser(managerA, managerB)).toBe(false);
      expect(canManageUser(managerA, admin)).toBe(false);
    });

    it("STAFF cannot manage anyone", () => {
      expect(canManageUser(staffA, staffA)).toBe(false);
      expect(canManageUser(staffA, staffB)).toBe(false);
      expect(canManageUser(staffA, managerA)).toBe(false);
      expect(canManageUser(staffA, admin)).toBe(false);
    });
  });

  describe("canCancelReservation", () => {
    const user1 = "u1111111-1111-1111-1111-111111111111";
    const user2 = "u2222222-2222-2222-2222-222222222222";

    const staff1 = { id: user1, role: "STAFF", siteId: siteA };
    const staff2 = { id: user2, role: "STAFF", siteId: siteA };
    const managerA = { id: "m1", role: "MANAGER", siteId: siteA };
    const managerB = { id: "m2", role: "MANAGER", siteId: siteB };
    const admin = { id: "a1", role: "ADMIN", siteId: null };

    const now = new Date("2026-10-13T10:00:00Z");
    const future = new Date("2026-10-13T11:00:00Z");
    const past = new Date("2026-10-13T09:00:00Z");

    const validBooking = {
      id: "res1",
      status: "CONFIRMED",
      kind: "BOOKING",
      startAt: future,
      createdById: user1,
      resource: { siteId: siteA },
    };

    it("allows staff to cancel their own booking before start", () => {
      expect(canCancelReservation(staff1, validBooking, now)).toBe(true);
    });

    it("refuses staff from cancelling someone else's booking", () => {
      expect(canCancelReservation(staff2, validBooking, now)).toBe(false);
    });

    it("allows the site's manager to cancel a booking at their site", () => {
      expect(canCancelReservation(managerA, validBooking, now)).toBe(true);
    });

    it("refuses a manager from another site from cancelling", () => {
      expect(canCancelReservation(managerB, validBooking, now)).toBe(false);
    });

    it("allows an admin to cancel a booking at any site", () => {
      expect(canCancelReservation(admin, validBooking, now)).toBe(true);
    });

    it("refuses cancelling a booking that has already started", () => {
      const startedBooking = { ...validBooking, startAt: past };
      expect(canCancelReservation(staff1, startedBooking, now)).toBe(false);
      expect(canCancelReservation(managerA, startedBooking, now)).toBe(false);
    });

    it("refuses cancelling a booking exactly at start time", () => {
      const exactBooking = { ...validBooking, startAt: now };
      expect(canCancelReservation(staff1, exactBooking, now)).toBe(false);
    });

    it("refuses cancelling maintenance blocks via this rule", () => {
      const maintBlock = { ...validBooking, kind: "MAINTENANCE" };
      expect(canCancelReservation(staff1, maintBlock, now)).toBe(false);
      expect(canCancelReservation(managerA, maintBlock, now)).toBe(false);
    });

    it("refuses cancelling an already cancelled reservation", () => {
      const cancelled = { ...validBooking, status: "CANCELLED" };
      expect(canCancelReservation(staff1, cancelled, now)).toBe(false);
    });
  });
});
