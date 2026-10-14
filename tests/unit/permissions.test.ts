import { describe, expect, it } from "vitest";
import {
  canManageSite,
  isAdmin,
  isManagerOrAdmin,
  rolesActorCanCreate,
  canManageUser,
  canCancelReservation,
  canBook,
  canManageSettings,
  canViewUsers,
  canViewUser,
  canChangeRoleOrSite,
  canManageResource,
  canChangeResourceStatus,
  canCancelBooking,
  canManageMaintenance,
  canOverseeBookings,
  bookingOversightSitesFor,
  canViewUsage,
  usageSitesFor,
  canManageEquipment,
  canViewEquipmentOverview,
  equipmentOverviewSitesFor,
} from "@/lib/permissions";

describe("Permissions matrix and helpers", () => {
  const siteA = "11111111-1111-1111-1111-111111111111";
  const siteB = "22222222-2222-2222-2222-222222222222";

  const admin = { id: "u-admin", role: "ADMIN", siteId: null };
  const managerA = { id: "u-mgr-a", role: "MANAGER", siteId: siteA };
  const managerB = { id: "u-mgr-b", role: "MANAGER", siteId: siteB };
  const staffA = { id: "u-staff-a", role: "STAFF", siteId: siteA };
  const staffB = { id: "u-staff-b", role: "STAFF", siteId: siteB };

  const resourceA = { id: "res-a", siteId: siteA, status: "ACTIVE" };
  const resourceARetired = { id: "res-a-ret", siteId: siteA, status: "RETIRED" };
  const resourceB = { id: "res-b", siteId: siteB, status: "ACTIVE" };

  describe("canBook (ADMIN cannot book; STAFF and MANAGER can)", () => {
    it.each([
      { actor: admin, expected: false, desc: "ADMIN cannot book ([ADMIN-NO-BOOK])" },
      { actor: managerA, expected: true, desc: "MANAGER can book" },
      { actor: staffA, expected: true, desc: "STAFF can book" },
    ])("$desc", ({ actor, expected }) => {
      expect(canBook(actor)).toBe(expected);
    });
  });

  describe("canManageSettings (ADMIN only)", () => {
    it.each([
      { actor: admin, expected: true, desc: "ADMIN can manage settings" },
      { actor: managerA, expected: false, desc: "MANAGER cannot manage settings" },
      { actor: staffA, expected: false, desc: "STAFF cannot manage settings" },
    ])("$desc", ({ actor, expected }) => {
      expect(canManageSettings(actor)).toBe(expected);
    });
  });

  describe("canViewUsers (MANAGER own site, ADMIN all)", () => {
    it.each([
      { actor: admin, expected: true, desc: "ADMIN can view users" },
      { actor: managerA, expected: true, desc: "MANAGER can view users" },
      { actor: staffA, expected: false, desc: "STAFF cannot view users directory" },
    ])("$desc", ({ actor, expected }) => {
      expect(canViewUsers(actor)).toBe(expected);
    });
  });

  describe("canViewUser (ADMIN all, MANAGER own site, STAFF none)", () => {
    it.each([
      { actor: admin, target: staffA, expected: true, desc: "ADMIN views staffA" },
      { actor: admin, target: staffB, expected: true, desc: "ADMIN views staffB" },
      { actor: admin, target: managerA, expected: true, desc: "ADMIN views managerA" },
      {
        actor: managerA,
        target: staffA,
        expected: true,
        desc: "ManagerA views staffA (same site)",
      },
      {
        actor: managerA,
        target: staffB,
        expected: false,
        desc: "ManagerA cannot view staffB (different site)",
      },
      { actor: managerA, target: managerB, expected: false, desc: "ManagerA cannot view managerB" },
      { actor: staffA, target: staffA, expected: false, desc: "STAFF cannot view users" },
    ])("$desc", ({ actor, target, expected }) => {
      expect(canViewUser(actor, target)).toBe(expected);
    });
  });

  describe("canChangeRoleOrSite (ADMIN only, not self)", () => {
    it.each([
      { actor: admin, target: staffA, expected: true, desc: "ADMIN changes role/site of staffA" },
      {
        actor: admin,
        target: managerA,
        expected: true,
        desc: "ADMIN changes role/site of managerA",
      },
      {
        actor: admin,
        target: admin,
        expected: false,
        desc: "ADMIN cannot change own role or site (C4)",
      },
      {
        actor: managerA,
        target: staffA,
        expected: false,
        desc: "MANAGER cannot change role or site",
      },
      { actor: staffA, target: staffB, expected: false, desc: "STAFF cannot change role or site" },
    ])("$desc", ({ actor, target, expected }) => {
      expect(canChangeRoleOrSite(actor, target)).toBe(expected);
    });
  });

  describe("canManageResource (STORED siteId)", () => {
    it.each([
      { actor: admin, resource: resourceA, expected: true, desc: "ADMIN manages resourceA" },
      { actor: admin, resource: resourceB, expected: true, desc: "ADMIN manages resourceB" },
      {
        actor: managerA,
        resource: resourceA,
        expected: true,
        desc: "ManagerA manages resourceA (own site)",
      },
      {
        actor: managerA,
        resource: resourceB,
        expected: false,
        desc: "ManagerA cannot manage resourceB (other site)",
      },
      {
        actor: staffA,
        resource: resourceA,
        expected: false,
        desc: "STAFF cannot manage resources",
      },
    ])("$desc", ({ actor, resource, expected }) => {
      expect(canManageResource(actor, resource)).toBe(expected);
    });
  });

  describe("canChangeResourceStatus (refuses RETIRED resources - C6)", () => {
    it.each([
      {
        actor: admin,
        resource: resourceA,
        expected: true,
        desc: "ADMIN changes status of active resourceA",
      },
      {
        actor: admin,
        resource: resourceARetired,
        expected: false,
        desc: "ADMIN cannot change status of RETIRED resourceA (C6 final)",
      },
      {
        actor: managerA,
        resource: resourceA,
        expected: true,
        desc: "ManagerA changes status of active resourceA",
      },
      {
        actor: managerA,
        resource: resourceARetired,
        expected: false,
        desc: "ManagerA cannot change status of RETIRED resourceA",
      },
      {
        actor: managerA,
        resource: resourceB,
        expected: false,
        desc: "ManagerA cannot change status of resourceB",
      },
      {
        actor: staffA,
        resource: resourceA,
        expected: false,
        desc: "STAFF cannot change resource status",
      },
    ])("$desc", ({ actor, resource, expected }) => {
      expect(canChangeResourceStatus(actor, resource)).toBe(expected);
    });
  });

  describe("canCancelBooking", () => {
    const bookingStaffA = {
      createdById: staffA.id,
      kind: "BOOKING",
      resource: { siteId: siteA },
    };
    const bookingStaffB = {
      createdById: staffB.id,
      kind: "BOOKING",
      resource: { siteId: siteB },
    };
    const maintenanceA = {
      createdById: managerA.id,
      kind: "MAINTENANCE",
      resource: { siteId: siteA },
    };

    it.each([
      { actor: staffA, booking: bookingStaffA, expected: true, desc: "STAFF cancels own booking" },
      {
        actor: staffB,
        booking: bookingStaffA,
        expected: false,
        desc: "STAFF cannot cancel someone else's booking",
      },
      {
        actor: managerA,
        booking: bookingStaffA,
        expected: true,
        desc: "ManagerA cancels booking at own site",
      },
      {
        actor: managerA,
        booking: bookingStaffB,
        expected: false,
        desc: "ManagerA cannot cancel booking at another site",
      },
      {
        actor: admin,
        booking: bookingStaffA,
        expected: true,
        desc: "ADMIN can cancel booking at site A",
      },
      {
        actor: admin,
        booking: bookingStaffB,
        expected: true,
        desc: "ADMIN can cancel booking at site B",
      },
      {
        actor: admin,
        booking: maintenanceA,
        expected: false,
        desc: "canCancelBooking refuses MAINTENANCE blocks",
      },
      {
        actor: managerA,
        booking: maintenanceA,
        expected: false,
        desc: "canCancelBooking refuses MAINTENANCE for manager",
      },
    ])("$desc", ({ actor, booking, expected }) => {
      expect(canCancelBooking(actor, booking)).toBe(expected);
    });
  });

  describe("canManageMaintenance", () => {
    it.each([
      {
        actor: admin,
        resource: resourceA,
        expected: true,
        desc: "ADMIN manages maintenance for resourceA",
      },
      {
        actor: managerA,
        resource: resourceA,
        expected: true,
        desc: "ManagerA manages maintenance for resourceA",
      },
      {
        actor: managerA,
        resource: resourceB,
        expected: false,
        desc: "ManagerA cannot manage maintenance for resourceB",
      },
      {
        actor: staffA,
        resource: resourceA,
        expected: false,
        desc: "STAFF cannot manage maintenance",
      },
    ])("$desc", ({ actor, resource, expected }) => {
      expect(canManageMaintenance(actor, resource)).toBe(expected);
    });
  });

  describe("canOverseeBookings & bookingOversightSitesFor", () => {
    it("ADMIN can oversee bookings across all sites", () => {
      expect(canOverseeBookings(admin)).toBe(true);
      expect(bookingOversightSitesFor(admin)).toBe("all");
    });

    it("MANAGER can oversee bookings for their own site only", () => {
      expect(canOverseeBookings(managerA)).toBe(true);
      expect(bookingOversightSitesFor(managerA)).toEqual([siteA]);
    });

    it("STAFF cannot oversee bookings", () => {
      expect(canOverseeBookings(staffA)).toBe(false);
      expect(bookingOversightSitesFor(staffA)).toEqual([]);
    });
  });

  describe("canViewUsage & usageSitesFor", () => {
    it("ADMIN can view network usage and any site usage", () => {
      expect(canViewUsage(admin, null)).toBe(true);
      expect(canViewUsage(admin, "all")).toBe(true);
      expect(canViewUsage(admin, siteA)).toBe(true);
      expect(usageSitesFor(admin)).toBe("all");
    });

    it("MANAGER can only view own site usage, not network overview", () => {
      expect(canViewUsage(managerA, null)).toBe(false);
      expect(canViewUsage(managerA, "all")).toBe(false);
      expect(canViewUsage(managerA, siteA)).toBe(true);
      expect(canViewUsage(managerA, siteB)).toBe(false);
      expect(usageSitesFor(managerA)).toEqual([siteA]);
    });

    it("STAFF cannot view usage", () => {
      expect(canViewUsage(staffA, null)).toBe(false);
      expect(canViewUsage(staffA, siteA)).toBe(false);
      expect(usageSitesFor(staffA)).toEqual([]);
    });
  });

  describe("Existing functions: canManageSite, isAdmin, isManagerOrAdmin, rolesActorCanCreate, canManageUser", () => {
    it("isAdmin and isManagerOrAdmin checks", () => {
      expect(isAdmin(admin)).toBe(true);
      expect(isAdmin(managerA)).toBe(false);
      expect(isAdmin(staffA)).toBe(false);

      expect(isManagerOrAdmin(admin)).toBe(true);
      expect(isManagerOrAdmin(managerA)).toBe(true);
      expect(isManagerOrAdmin(staffA)).toBe(false);
    });

    it("canManageSite allows ADMIN any site, MANAGER own site, STAFF none", () => {
      expect(canManageSite(admin, siteA)).toBe(true);
      expect(canManageSite(managerA, siteA)).toBe(true);
      expect(canManageSite(managerA, siteB)).toBe(false);
      expect(canManageSite(staffA, siteA)).toBe(false);
    });

    it("rolesActorCanCreate", () => {
      expect(rolesActorCanCreate(admin)).toEqual(["STAFF", "MANAGER", "ADMIN"]);
      expect(rolesActorCanCreate(managerA)).toEqual(["STAFF"]);
      expect(rolesActorCanCreate(staffA)).toEqual([]);
    });

    it("canManageUser enforces manager site-locking", () => {
      expect(canManageUser(admin, staffA)).toBe(true);
      expect(canManageUser(managerA, staffA)).toBe(true);
      expect(canManageUser(managerA, staffB)).toBe(false);
      expect(canManageUser(managerA, managerA)).toBe(false);
      expect(canManageUser(staffA, staffA)).toBe(false);
    });

    it("canCancelReservation backward-compat check", () => {
      const now = new Date("2026-10-14T10:00:00Z");
      const future = new Date("2026-10-14T12:00:00Z");
      const past = new Date("2026-10-14T08:00:00Z");

      const futureBooking = {
        createdById: staffA.id,
        kind: "BOOKING",
        status: "CONFIRMED",
        startAt: future,
        resource: { siteId: siteA },
      };

      const pastBooking = {
        ...futureBooking,
        startAt: past,
      };

      expect(canCancelReservation(staffA, futureBooking, now)).toBe(true);
      expect(canCancelReservation(staffA, pastBooking, now)).toBe(false);
      expect(canCancelReservation(managerA, futureBooking, now)).toBe(true);
      expect(canCancelReservation(managerB, futureBooking, now)).toBe(false);
    });

    it("canManageEquipment allows admin for all and manager for own site only", () => {
      const resA = { id: "res-a", siteId: siteA };
      const resB = { id: "res-b", siteId: siteB };

      expect(canManageEquipment(admin, resA)).toBe(true);
      expect(canManageEquipment(admin, resB)).toBe(true);
      expect(canManageEquipment(managerA, resA)).toBe(true);
      expect(canManageEquipment(managerA, resB)).toBe(false);
      expect(canManageEquipment(staffA, resA)).toBe(false);
    });

    it("canViewEquipmentOverview allows manager and admin only", () => {
      expect(canViewEquipmentOverview(admin)).toBe(true);
      expect(canViewEquipmentOverview(managerA)).toBe(true);
      expect(canViewEquipmentOverview(staffA)).toBe(false);
    });

    it("equipmentOverviewSitesFor scopes sites correctly", () => {
      expect(equipmentOverviewSitesFor(admin)).toBe("all");
      expect(equipmentOverviewSitesFor(managerA)).toEqual([siteA]);
      expect(equipmentOverviewSitesFor(staffA)).toEqual([]);
    });
  });
});
