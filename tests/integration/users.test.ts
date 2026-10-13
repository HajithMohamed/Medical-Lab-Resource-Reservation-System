import { describe, expect, it, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { resetDatabase, createTestData } from "../helpers/db";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  resetPassword,
  setActive,
} from "@/services/users";
import { Role, ReservationKind, ReservationStatus } from "@/generated/prisma/client";

describe("Users Service (Integration)", () => {
  let fixture: Awaited<ReturnType<typeof createTestData>>;
  let adminActor: { id: string; role: Role; siteId: null };
  let managerActor: { id: string; role: Role; siteId: string };
  let site2: { id: string; name: string };
  let staffAtSite2: { id: string };

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestData();

    // Create an Admin user
    const admin = await db.user.create({
      data: {
        name: "Test Admin",
        email: "test.admin@lab.example",
        passwordHash: "test-hash",
        role: Role.ADMIN,
        mustChangePassword: false,
      },
    });

    adminActor = { id: admin.id, role: Role.ADMIN, siteId: null };
    managerActor = {
      id: fixture.managerUser.id,
      role: Role.MANAGER,
      siteId: fixture.site.id,
    };

    // Create a second site with its own staff
    site2 = await db.site.create({
      data: {
        name: "Second Lab Site",
        address: "789 Other Road",
      },
    });

    staffAtSite2 = await db.user.create({
      data: {
        name: "Site2 Staff",
        email: "staff2@lab.example",
        passwordHash: "test-hash",
        role: Role.STAFF,
        siteId: site2.id,
        mustChangePassword: false,
      },
    });
  });

  describe("Creation and Permissions", () => {
    it("a manager creates STAFF at their own site even when the form sends another siteId", async () => {
      const res = await createUser(managerActor, {
        name: "New Site1 Staff",
        email: "new.staff@lab.example",
        role: Role.STAFF,
        siteId: site2.id, // Trying to assign to site2
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.data.name).toBe("New Site1 Staff");
      expect(res.data.temporaryPassword).toBeDefined();

      const created = await db.user.findUnique({
        where: { id: res.data.userId },
      });

      // Manager's own site must be enforced, ignoring form siteId
      expect(created?.siteId).toBe(fixture.site.id);
      expect(created?.role).toBe(Role.STAFF);
      expect(created?.mustChangePassword).toBe(true);
    });

    it("a manager cannot create a MANAGER or ADMIN", async () => {
      const resManager = await createUser(managerActor, {
        name: "Unauthorized Manager",
        email: "unauth.manager@lab.example",
        role: Role.MANAGER,
      });

      expect(resManager.ok).toBe(false);
      if (!resManager.ok) {
        expect(resManager.error).toBe("You do not have permission to create this role.");
      }

      const resAdmin = await createUser(managerActor, {
        name: "Unauthorized Admin",
        email: "unauth.admin@lab.example",
        role: Role.ADMIN,
      });

      expect(resAdmin.ok).toBe(false);
    });

    it("a duplicate email is refused in any letter case", async () => {
      const res = await createUser(adminActor, {
        name: "Duplicate User",
        email: "TEST.STAFF@LAB.EXAMPLE", // Existing is test.staff@lab.example
        role: Role.STAFF,
        siteId: fixture.site.id,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("An account with this email already exists.");
      }
    });
  });

  describe("Site Scope and Access Control", () => {
    it("a manager cannot see, edit, reset or deactivate staff of another site", async () => {
      // 1. Manager listUsers does not include site2 staff
      const listRes = await listUsers(managerActor);
      expect(listRes.ok).toBe(true);
      if (listRes.ok) {
        const ids = listRes.data.map((u) => u.id);
        expect(ids).toContain(fixture.staffUser.id);
        expect(ids).not.toContain(staffAtSite2.id);
      }

      // 2. getUser returns not found (null)
      const getRes = await getUser(managerActor, staffAtSite2.id);
      expect(getRes.ok).toBe(false);
      if (!getRes.ok) {
        expect(getRes.error).toBe("User not found.");
      }

      // 3. updateUser refused
      const updateRes = await updateUser(managerActor, staffAtSite2.id, {
        name: "Hacked Name",
      });
      expect(updateRes.ok).toBe(false);
      if (!updateRes.ok) {
        expect(updateRes.error).toBe("User not found.");
      }

      // 4. resetPassword refused
      const resetRes = await resetPassword(managerActor, staffAtSite2.id);
      expect(resetRes.ok).toBe(false);
      if (!resetRes.ok) {
        expect(resetRes.error).toBe("User not found.");
      }

      // 5. setActive refused
      const activeRes = await setActive(managerActor, staffAtSite2.id, false);
      expect(activeRes.ok).toBe(false);
      if (!activeRes.ok) {
        expect(activeRes.error).toBe("User not found.");
      }
    });

    it("changing a STAFF user to ADMIN clears the site, and changing an ADMIN to STAFF without a site is refused with a message", async () => {
      // 1. Staff to Admin: clears siteId
      const updateToAdmin = await updateUser(adminActor, fixture.staffUser.id, {
        role: Role.ADMIN,
      });
      expect(updateToAdmin.ok).toBe(true);

      const promotedUser = await db.user.findUnique({
        where: { id: fixture.staffUser.id },
      });
      expect(promotedUser?.role).toBe(Role.ADMIN);
      expect(promotedUser?.siteId).toBeNull();

      // 2. Admin to Staff without site: refused
      const updateToStaffNoSite = await updateUser(adminActor, fixture.staffUser.id, {
        role: Role.STAFF,
      });
      expect(updateToStaffNoSite.ok).toBe(false);
      if (!updateToStaffNoSite.ok) {
        expect(updateToStaffNoSite.error).toContain(
          "A site must be assigned when changing an administrator to a staff member or manager.",
        );
      }

      // 3. Admin to Staff with site: succeeds
      const updateToStaffWithSite = await updateUser(adminActor, fixture.staffUser.id, {
        role: Role.STAFF,
        siteId: fixture.site.id,
      });
      expect(updateToStaffWithSite.ok).toBe(true);

      const demotedUser = await db.user.findUnique({
        where: { id: fixture.staffUser.id },
      });
      expect(demotedUser?.role).toBe(Role.STAFF);
      expect(demotedUser?.siteId).toBe(fixture.site.id);
    });
  });

  describe("Password Reset", () => {
    it("a reset clears the lock, sets mustChangePassword and changes sessionVersion", async () => {
      // Set user into locked state with sessionVersion 1
      await db.user.update({
        where: { id: fixture.staffUser.id },
        data: {
          failedLoginCount: 5,
          lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });

      const res = await resetPassword(managerActor, fixture.staffUser.id);
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.data.temporaryPassword).toBeDefined();

      const updated = await db.user.findUnique({
        where: { id: fixture.staffUser.id },
      });

      expect(updated?.failedLoginCount).toBe(0);
      expect(updated?.lockedUntil).toBeNull();
      expect(updated?.mustChangePassword).toBe(true);
      expect(updated?.sessionVersion).toBe(2);
    });
  });

  describe("Deactivation and Reactivation", () => {
    it("deactivation cancels only that user's upcoming CONFIRMED bookings (not past ones, not maintenance) with the reason, and changes sessionVersion", async () => {
      const now = new Date();
      const pastStart = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const pastEnd = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      const futureStart = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const futureEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000);

      // 1. Upcoming confirmed booking by staffUser (should be cancelled)
      const upcomingBooking = await db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: fixture.staffUser.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Blood analysis",
          startAt: futureStart,
          endAt: futureEnd,
        },
      });

      // 2. Past confirmed booking by staffUser (should stay confirmed)
      const pastBooking = await db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: fixture.staffUser.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Past session",
          startAt: pastStart,
          endAt: pastEnd,
        },
      });

      // 3. Upcoming maintenance block by staffUser (should stay confirmed)
      const maintenanceBlock = await db.reservation.create({
        data: {
          resourceId: fixture.resource2.id,
          createdById: fixture.staffUser.id,
          kind: ReservationKind.MAINTENANCE,
          status: ReservationStatus.CONFIRMED,
          purpose: "Filter replacement",
          startAt: futureStart,
          endAt: futureEnd,
        },
      });

      // 4. Another user's upcoming confirmed booking (should stay confirmed)
      const futureStart2 = new Date(futureEnd.getTime() + 1 * 60 * 60 * 1000);
      const futureEnd2 = new Date(futureEnd.getTime() + 3 * 60 * 60 * 1000);
      const otherUserBooking = await db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: managerActor.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Manager review",
          startAt: futureStart2,
          endAt: futureEnd2,
        },
      });

      // Initial session version
      const initialUser = await db.user.findUnique({
        where: { id: fixture.staffUser.id },
      });
      const initialSessionVersion = initialUser?.sessionVersion ?? 1;

      // Deactivate user
      const deactivateRes = await setActive(managerActor, fixture.staffUser.id, false);
      expect(deactivateRes.ok).toBe(true);
      if (!deactivateRes.ok) return;

      expect(deactivateRes.data.cancelledBookingsCount).toBe(1);

      // Verify user record
      const deactivatedUser = await db.user.findUnique({
        where: { id: fixture.staffUser.id },
      });
      expect(deactivatedUser?.isActive).toBe(false);
      expect(deactivatedUser?.sessionVersion).toBe(initialSessionVersion + 1);

      // Verify upcoming booking was cancelled with reason and cancelledById
      const checkedUpcoming = await db.reservation.findUnique({
        where: { id: upcomingBooking.id },
      });
      expect(checkedUpcoming?.status).toBe(ReservationStatus.CANCELLED);
      expect(checkedUpcoming?.cancelReason).toBe(
        "Booking cancelled because the account was deactivated",
      );
      expect(checkedUpcoming?.cancelledById).toBe(managerActor.id);

      // Verify past booking was untouched
      const checkedPast = await db.reservation.findUnique({
        where: { id: pastBooking.id },
      });
      expect(checkedPast?.status).toBe(ReservationStatus.CONFIRMED);

      // Verify maintenance block was untouched
      const checkedMaint = await db.reservation.findUnique({
        where: { id: maintenanceBlock.id },
      });
      expect(checkedMaint?.status).toBe(ReservationStatus.CONFIRMED);

      // Verify other user's booking was untouched
      const checkedOther = await db.reservation.findUnique({
        where: { id: otherUserBooking.id },
      });
      expect(checkedOther?.status).toBe(ReservationStatus.CONFIRMED);

      // Reactivate user
      const reactivateRes = await setActive(managerActor, fixture.staffUser.id, true);
      expect(reactivateRes.ok).toBe(true);

      const reactivatedUser = await db.user.findUnique({
        where: { id: fixture.staffUser.id },
      });
      expect(reactivatedUser?.isActive).toBe(true);
    });

    it("nobody can deactivate themselves", async () => {
      const res = await setActive(adminActor, adminActor.id, false);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("You cannot deactivate your own account.");
      }
    });

    it("the last admin is protected from deactivation and demotion", async () => {
      // There is only 1 admin: adminActor
      // 1. Try to deactivate the last admin by another manager/actor (or simulate)
      // Even if another actor had permission, setActive checks active admin count
      const deactRes = await setActive(
        { id: "some-other-id", role: Role.ADMIN, siteId: null },
        adminActor.id,
        false,
      );
      expect(deactRes.ok).toBe(false);
      if (!deactRes.ok) {
        expect(deactRes.error).toBe("The last active administrator cannot be deactivated.");
      }

      // 2. Try to demote the last admin
      const demoteRes = await updateUser(
        { id: "some-other-id", role: Role.ADMIN, siteId: null },
        adminActor.id,
        {
          role: Role.STAFF,
          siteId: fixture.site.id,
        },
      );
      expect(demoteRes.ok).toBe(false);
      if (!demoteRes.ok) {
        expect(demoteRes.error).toBe("The last active administrator cannot be demoted.");
      }
    });
  });
});
