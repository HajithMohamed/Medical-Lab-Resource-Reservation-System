import { describe, expect, it, beforeEach } from "vitest";
import { addDays, subDays } from "date-fns";
import { db } from "@/lib/db";
import { resetDatabase, createTestData } from "../helpers/db";
import { createBooking, cancelBooking, listBookingsForOversight } from "@/services/bookings";
import { updateResource, changeStatus } from "@/services/resources";
import { getUser } from "@/services/users";
import {
  Role,
  ResourceStatus,
  ReservationKind,
  ReservationStatus,
} from "@/generated/prisma/client";
import { parseLabDateTime } from "@/lib/time";

describe("Access Control & Permission Matrix (Integration)", () => {
  let fixture: Awaited<ReturnType<typeof createTestData>>;
  let adminUser: { id: string; role: Role; siteId: null; name: string };
  let mgrColombo: { id: string; role: Role; siteId: string; name: string };
  let mgrKandy: { id: string; role: Role; siteId: string; name: string };
  let staffColombo: { id: string; role: Role; siteId: string; name: string };
  let staffKandy: { id: string; role: Role; siteId: string; name: string };

  let siteColombo: { id: string; name: string };
  let siteKandy: { id: string; name: string };
  let sectionColombo: { id: string; name: string };
  let sectionKandy: { id: string; name: string };
  let categoryMol: { id: string; name: string; maxBookingMinutes: number };

  let resColombo: { id: string; name: string; siteId: string };
  let resKandy: { id: string; name: string; siteId: string };

  const zone = "Asia/Colombo";

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestData();

    siteColombo = fixture.site;
    sectionColombo = fixture.section;
    categoryMol = fixture.category;

    const createdAdmin = await db.user.create({
      data: {
        name: "Test Admin",
        email: "test.admin@lab.example",
        passwordHash: "test-hash",
        role: Role.ADMIN,
        siteId: null,
        mustChangePassword: false,
      },
    });

    adminUser = {
      id: createdAdmin.id,
      role: Role.ADMIN,
      siteId: null,
      name: createdAdmin.name,
    };

    mgrColombo = {
      id: fixture.managerUser.id,
      role: Role.MANAGER,
      siteId: siteColombo.id,
      name: fixture.managerUser.name,
    };

    staffColombo = {
      id: fixture.staffUser.id,
      role: Role.STAFF,
      siteId: siteColombo.id,
      name: fixture.staffUser.name,
    };

    resColombo = {
      id: fixture.resource1.id,
      name: fixture.resource1.name,
      siteId: siteColombo.id,
    };

    // Create Site Kandy
    siteKandy = await db.site.create({
      data: { name: "Kandy Teaching Hospital Lab", address: "Kandy" },
    });

    sectionKandy = await db.section.create({
      data: { name: "Microbiology" },
    });

    // Create Manager Kandy
    const uMgrKandy = await db.user.create({
      data: {
        name: "Ruwan Jayasinghe",
        email: "ruwan.kandy@lab.example",
        passwordHash: "test-hash",
        role: Role.MANAGER,
        siteId: siteKandy.id,
        mustChangePassword: false,
      },
    });
    mgrKandy = {
      id: uMgrKandy.id,
      role: Role.MANAGER,
      siteId: siteKandy.id,
      name: uMgrKandy.name,
    };

    // Create Staff Kandy
    const uStaffKandy = await db.user.create({
      data: {
        name: "Chamari Herath",
        email: "chamari.kandy@lab.example",
        passwordHash: "test-hash",
        role: Role.STAFF,
        siteId: siteKandy.id,
        sectionId: sectionKandy.id,
        mustChangePassword: false,
      },
    });
    staffKandy = {
      id: uStaffKandy.id,
      role: Role.STAFF,
      siteId: siteKandy.id,
      name: uStaffKandy.name,
    };

    // Create Resource Kandy
    const rKandy = await db.resource.create({
      data: {
        name: "Kandy Real-Time PCR 1",
        siteId: siteKandy.id,
        categoryId: categoryMol.id,
        sectionId: sectionKandy.id,
        status: ResourceStatus.ACTIVE,
      },
    });
    resKandy = {
      id: rKandy.id,
      name: rKandy.name,
      siteId: siteKandy.id,
    };
  });

  describe("Site-scoped Manager isolation (Kandy manager vs Colombo resource)", () => {
    it("manager of Kandy cannot edit a Colombo resource", async () => {
      const res = await updateResource(mgrKandy, resColombo.id, {
        name: "Renamed by Kandy Manager",
        siteId: siteColombo.id,
        categoryId: categoryMol.id,
        sectionId: sectionColombo.id,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("You do not have permission to manage this resource");
      }
    });

    it("manager of Kandy cannot change status of a Colombo resource", async () => {
      const res = await changeStatus(
        mgrKandy,
        resColombo.id,
        ResourceStatus.OUT_OF_SERVICE,
        "Fault reported by Kandy manager",
      );

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("You do not have permission to manage this resource");
      }
    });

    it("manager of Kandy cannot view a Colombo user (returns not found)", async () => {
      const res = await getUser(mgrKandy, staffColombo.id);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("User not found.");
      }
    });

    it("manager of Kandy cannot cancel a Colombo booking", async () => {
      const tomorrow = addDays(new Date(), 1);
      const startAt = parseLabDateTime(tomorrow.toISOString().slice(0, 10), "10:00", zone);
      const endAt = parseLabDateTime(tomorrow.toISOString().slice(0, 10), "12:00", zone);

      const booking = await createBooking(staffColombo, {
        resourceId: resColombo.id,
        startAt,
        endAt,
        purpose: "Kasun molecular run",
      });
      expect(booking.ok).toBe(true);
      if (!booking.ok) return;

      const cancelRes = await cancelBooking(
        mgrKandy,
        booking.data.id,
        "Manager Kandy attempting to cancel Colombo booking",
      );

      expect(cancelRes.ok).toBe(false);
      if (!cancelRes.ok) {
        expect(cancelRes.error).toContain("You are not authorized to cancel this reservation");
      }
    });

    it("manager of Kandy cannot see Colombo bookings in oversight", async () => {
      const tomorrow = addDays(new Date(), 1);
      const startAt = parseLabDateTime(tomorrow.toISOString().slice(0, 10), "10:00", zone);
      const endAt = parseLabDateTime(tomorrow.toISOString().slice(0, 10), "12:00", zone);

      // Create Colombo booking
      await createBooking(staffColombo, {
        resourceId: resColombo.id,
        startAt,
        endAt,
        purpose: "Colombo run",
      });

      // Create Kandy booking
      await createBooking(staffKandy, {
        resourceId: resKandy.id,
        startAt,
        endAt,
        purpose: "Kandy run",
      });

      // Manager Kandy queries oversight (even if attempting to request siteId = Colombo)
      const oversight = await listBookingsForOversight(mgrKandy, {
        siteId: siteColombo.id,
      });

      expect(oversight.items.length).toBe(1);
      expect(oversight.items[0].resource.id).toBe(resKandy.id);
      expect(oversight.items[0].resource.site.name).toBe("Kandy Teaching Hospital Lab");
    });
  });

  describe("Staff cancellation restrictions", () => {
    it("staff cannot cancel another person's booking", async () => {
      const tomorrow = addDays(new Date(), 1);
      const startAt = parseLabDateTime(tomorrow.toISOString().slice(0, 10), "13:00", zone);
      const endAt = parseLabDateTime(tomorrow.toISOString().slice(0, 10), "14:00", zone);

      const booking = await createBooking(staffColombo, {
        resourceId: resColombo.id,
        startAt,
        endAt,
        purpose: "Kasun's run",
      });
      expect(booking.ok).toBe(true);
      if (!booking.ok) return;

      const cancelRes = await cancelBooking(
        staffKandy,
        booking.data.id,
        "Colleague trying to cancel",
      );

      expect(cancelRes.ok).toBe(false);
      if (!cancelRes.ok) {
        expect(cancelRes.error).toContain("You are not authorized to cancel this reservation");
      }
    });
  });

  describe("ADMIN-NO-BOOK separation of duties", () => {
    it("ADMIN cannot create a booking", async () => {
      const tomorrow = addDays(new Date(), 1);
      const startAt = parseLabDateTime(tomorrow.toISOString().slice(0, 10), "09:00", zone);
      const endAt = parseLabDateTime(tomorrow.toISOString().slice(0, 10), "10:00", zone);

      const res = await createBooking(adminUser, {
        resourceId: resColombo.id,
        startAt,
        endAt,
        purpose: "Admin test booking",
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe(
          "Admins manage the network and do not book. Use a staff or manager account.",
        );
      }
    });

    it("ADMIN can cancel any not-started booking with a reason", async () => {
      const tomorrow = addDays(new Date(), 1);
      const startAt = parseLabDateTime(tomorrow.toISOString().slice(0, 10), "15:00", zone);
      const endAt = parseLabDateTime(tomorrow.toISOString().slice(0, 10), "16:00", zone);

      const booking = await createBooking(staffColombo, {
        resourceId: resColombo.id,
        startAt,
        endAt,
        purpose: "Run to be cancelled by admin",
      });
      expect(booking.ok).toBe(true);
      if (!booking.ok) return;

      const cancelRes = await cancelBooking(
        adminUser,
        booking.data.id,
        "Network-wide maintenance protocol intervention",
      );

      expect(cancelRes.ok).toBe(true);
      if (!cancelRes.ok) return;

      expect(cancelRes.data.status).toBe("CANCELLED");
      expect(cancelRes.data.cancelReason).toBe("Network-wide maintenance protocol intervention");
    });
  });

  describe("Started booking cancellation guard", () => {
    it("nobody can cancel a booking that has already started", async () => {
      const pastStart = subDays(new Date(), 1);
      const pastEnd = new Date(pastStart.getTime() + 60 * 60 * 1000);

      // Directly insert an already-started booking
      const startedBooking = await db.reservation.create({
        data: {
          resourceId: resColombo.id,
          createdById: staffColombo.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          startAt: pastStart,
          endAt: pastEnd,
          purpose: "Yesterday's run",
        },
      });

      // Owner attempt
      const ownerRes = await cancelBooking(
        staffColombo,
        startedBooking.id,
        "Owner cancelling past run",
      );
      expect(ownerRes.ok).toBe(false);
      if (!ownerRes.ok) {
        expect(ownerRes.error).toBe("Cannot cancel a booking that has already started.");
      }

      // Manager attempt
      const mgrRes = await cancelBooking(
        mgrColombo,
        startedBooking.id,
        "Manager cancelling past run",
      );
      expect(mgrRes.ok).toBe(false);
      if (!mgrRes.ok) {
        expect(mgrRes.error).toBe("Cannot cancel a booking that has already started.");
      }

      // Admin attempt
      const adminRes = await cancelBooking(
        adminUser,
        startedBooking.id,
        "Admin cancelling past run",
      );
      expect(adminRes.ok).toBe(false);
      if (!adminRes.ok) {
        expect(adminRes.error).toBe("Cannot cancel a booking that has already started.");
      }
    });
  });

  describe("Retired resource status immutability (Constraint C6)", () => {
    it("refuses any status change on a RETIRED resource", async () => {
      const retiredRes = await db.resource.create({
        data: {
          name: "Decommissioned Analyser 1998",
          siteId: siteColombo.id,
          categoryId: categoryMol.id,
          sectionId: sectionColombo.id,
          status: ResourceStatus.RETIRED,
        },
      });

      // Admin tries to make it ACTIVE
      const activeRes = await changeStatus(
        adminUser,
        retiredRes.id,
        ResourceStatus.ACTIVE,
        "Attempting to bring back retired instrument",
      );

      expect(activeRes.ok).toBe(false);
      if (!activeRes.ok) {
        expect(activeRes.error).toBe(
          "This resource is retired. Its history is kept, but its status cannot change.",
        );
      }

      // Admin tries to make it OUT_OF_SERVICE
      const oosRes = await changeStatus(
        adminUser,
        retiredRes.id,
        ResourceStatus.OUT_OF_SERVICE,
        "Attempting to take out of service",
      );

      expect(oosRes.ok).toBe(false);
      if (!oosRes.ok) {
        expect(oosRes.error).toBe(
          "This resource is retired. Its history is kept, but its status cannot change.",
        );
      }
    });

    it("refuses a change to the same status", async () => {
      const res = await changeStatus(adminUser, resColombo.id, ResourceStatus.ACTIVE);

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("The resource is already active.");
      }
    });
  });
});
