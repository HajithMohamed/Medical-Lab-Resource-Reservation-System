import { describe, expect, it, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { resetDatabase, createTestData } from "../helpers/db";
import {
  listResources,
  getResource,
  createResource,
  updateResource,
  countUpcomingBookings,
  changeStatus,
} from "@/services/resources";
import {
  Role,
  ResourceStatus,
  ReservationKind,
  ReservationStatus,
} from "@/generated/prisma/client";

describe("Resources Service (Integration)", () => {
  let fixture: Awaited<ReturnType<typeof createTestData>>;
  let adminActor: { id: string; role: Role; siteId: null };
  let colomboManager: { id: string; role: Role; siteId: string };
  let staffActor: { id: string; role: Role; siteId: string };
  let kandySite: { id: string; name: string };
  let kandyManager: { id: string; role: Role; siteId: string };
  let kandyResource: { id: string; name: string };

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestData();

    // Admin actor
    const admin = await db.user.create({
      data: {
        name: "Test Admin",
        email: "admin@lab.example",
        passwordHash: "test-hash",
        role: Role.ADMIN,
        mustChangePassword: false,
      },
    });
    adminActor = { id: admin.id, role: Role.ADMIN, siteId: null };

    // Colombo manager (using fixture site as Colombo)
    colomboManager = {
      id: fixture.managerUser.id,
      role: Role.MANAGER,
      siteId: fixture.site.id,
    };

    // Staff actor
    staffActor = {
      id: fixture.staffUser.id,
      role: Role.STAFF,
      siteId: fixture.site.id,
    };

    // Kandy site
    kandySite = await db.site.create({
      data: {
        name: "Kandy Branch Laboratory",
        address: "45 Peradeniya Road, Kandy",
      },
    });

    // Kandy manager
    const km = await db.user.create({
      data: {
        name: "Kandy Manager",
        email: "kandy.manager@lab.example",
        passwordHash: "test-hash",
        role: Role.MANAGER,
        siteId: kandySite.id,
        mustChangePassword: false,
      },
    });
    kandyManager = { id: km.id, role: Role.MANAGER, siteId: kandySite.id };

    // Kandy resource
    kandyResource = await db.resource.create({
      data: {
        name: "Kandy Centrifuge",
        categoryId: fixture.category.id,
        siteId: kandySite.id,
        sectionId: fixture.section.id,
        status: ResourceStatus.ACTIVE,
      },
    });
  });

  describe("Permissions & Creation", () => {
    it("a manager creates a resource at their own site but not at another", async () => {
      // 1. Create at own site (Colombo)
      const resOwn = await createResource(colomboManager, {
        name: "Colombo PCR Machine",
        siteId: fixture.site.id,
        categoryId: fixture.category.id,
        sectionId: fixture.section.id,
        location: "Room 101",
      });

      expect(resOwn.ok).toBe(true);
      if (!resOwn.ok) return;
      expect(resOwn.data.name).toBe("Colombo PCR Machine");
      expect(resOwn.data.siteId).toBe(fixture.site.id);
      expect(resOwn.data.status).toBe(ResourceStatus.ACTIVE);

      // 2. Attempt to create at another site (Kandy)
      const resOther = await createResource(colomboManager, {
        name: "Unauthorized Kandy Machine",
        siteId: kandySite.id,
        categoryId: fixture.category.id,
        sectionId: fixture.section.id,
      });

      expect(resOther.ok).toBe(false);
      if (!resOther.ok) {
        expect(resOther.error).toBe("You do not have permission to add resources for this site.");
      }
    });

    it("staff cannot create one", async () => {
      const res = await createResource(staffActor, {
        name: "Staff Machine",
        siteId: fixture.site.id,
        categoryId: fixture.category.id,
        sectionId: fixture.section.id,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("You do not have permission to add resources for this site.");
      }
    });

    it("duplicate name per site produces friendly message", async () => {
      // First creation
      const res1 = await createResource(colomboManager, {
        name: "Unique Biosafety Cabinet",
        siteId: fixture.site.id,
        categoryId: fixture.category.id,
        sectionId: fixture.section.id,
      });
      expect(res1.ok).toBe(true);

      // Duplicate in same site
      const res2 = await createResource(colomboManager, {
        name: "Unique Biosafety Cabinet",
        siteId: fixture.site.id,
        categoryId: fixture.category.id,
        sectionId: fixture.section.id,
      });
      expect(res2.ok).toBe(false);
      if (!res2.ok) {
        expect(res2.error).toBe(
          `${fixture.site.name} already has a resource called Unique Biosafety Cabinet.`,
        );
      }

      // Same name at a DIFFERENT site is permitted
      const resKandy = await createResource(kandyManager, {
        name: "Unique Biosafety Cabinet",
        siteId: kandySite.id,
        categoryId: fixture.category.id,
        sectionId: fixture.section.id,
      });
      expect(resKandy.ok).toBe(true);
    });
  });

  describe("Updates & Site Restrictions", () => {
    it("a manager cannot move a resource to another site", async () => {
      const res = await updateResource(colomboManager, fixture.resource1.id, {
        name: fixture.resource1.name,
        siteId: kandySite.id, // Trying to move to Kandy
        categoryId: fixture.category.id,
        sectionId: fixture.section.id,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("You do not have permission to move resources to that site.");
      }

      // Check stored resource still belongs to Colombo
      const stored = await db.resource.findUnique({
        where: { id: fixture.resource1.id },
      });
      expect(stored?.siteId).toBe(fixture.site.id);
    });

    it("a Colombo manager cannot update a Kandy resource even when the form sends the Colombo siteId", async () => {
      // Form sends Colombo siteId, but the resource stored site is Kandy
      const res = await updateResource(colomboManager, kandyResource.id, {
        name: "Renamed Kandy Centrifuge",
        siteId: fixture.site.id,
        categoryId: fixture.category.id,
        sectionId: fixture.section.id,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("You do not have permission to manage this resource.");
      }
    });

    it("an admin can update any resource and move it to another site", async () => {
      const res = await updateResource(adminActor, kandyResource.id, {
        name: "Moved Centrifuge",
        siteId: fixture.site.id,
        categoryId: fixture.category.id,
        sectionId: fixture.section.id,
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.siteId).toBe(fixture.site.id);
      expect(res.data.name).toBe("Moved Centrifuge");
    });
  });

  describe("Status Changes & Atomic Booking Cancellation", () => {
    it("OUT_OF_SERVICE cancels only upcoming CONFIRMED bookings of that resource with recorded reason", async () => {
      const now = new Date();
      const pastStart = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      const pastEnd = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const futureStart = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const futureEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      const futureMaintStart = new Date(now.getTime() + 5 * 60 * 60 * 1000);
      const futureMaintEnd = new Date(now.getTime() + 7 * 60 * 60 * 1000);

      // 1. Future confirmed booking on resource 1
      const futureBookingRes1 = await db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: fixture.staffUser.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Future qPCR run",
          startAt: futureStart,
          endAt: futureEnd,
        },
      });

      // 2. Past confirmed booking on resource 1
      const pastBookingRes1 = await db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: fixture.staffUser.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Past qPCR run",
          startAt: pastStart,
          endAt: pastEnd,
        },
      });

      // 3. Future maintenance block on resource 1
      const futureMaintRes1 = await db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: fixture.managerUser.id,
          kind: ReservationKind.MAINTENANCE,
          status: ReservationStatus.CONFIRMED,
          purpose: "Annual calibration",
          startAt: futureMaintStart,
          endAt: futureMaintEnd,
        },
      });

      // 4. Future confirmed booking on resource 2 (another resource)
      const futureBookingRes2 = await db.reservation.create({
        data: {
          resourceId: fixture.resource2.id,
          createdById: fixture.staffUser.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Other resource booking",
          startAt: futureStart,
          endAt: futureEnd,
        },
      });

      // Upcoming bookings count check before status change
      const upcomingCount = await countUpcomingBookings(fixture.resource1.id);
      expect(upcomingCount).toBe(1);

      // Change status to OUT_OF_SERVICE
      const statusRes = await changeStatus(
        colomboManager,
        fixture.resource1.id,
        ResourceStatus.OUT_OF_SERVICE,
        "Laser alignment drift detected",
      );

      expect(statusRes.ok).toBe(true);
      if (!statusRes.ok) return;
      expect(statusRes.data.status).toBe(ResourceStatus.OUT_OF_SERVICE);
      expect(statusRes.data.cancelledBookingsCount).toBe(1);

      // Verify future booking on resource 1 was cancelled with exact reason
      const updatedFutureBooking1 = await db.reservation.findUnique({
        where: { id: futureBookingRes1.id },
      });
      expect(updatedFutureBooking1?.status).toBe(ReservationStatus.CANCELLED);
      expect(updatedFutureBooking1?.cancelReason).toBe(
        "Resource out of service: Laser alignment drift detected",
      );
      expect(updatedFutureBooking1?.cancelledById).toBe(colomboManager.id);
      expect(updatedFutureBooking1?.cancelledAt).toBeDefined();

      // Verify past booking on resource 1 is STILL CONFIRMED
      const updatedPastBooking1 = await db.reservation.findUnique({
        where: { id: pastBookingRes1.id },
      });
      expect(updatedPastBooking1?.status).toBe(ReservationStatus.CONFIRMED);

      // Verify maintenance on resource 1 is STILL CONFIRMED
      const updatedMaint1 = await db.reservation.findUnique({
        where: { id: futureMaintRes1.id },
      });
      expect(updatedMaint1?.status).toBe(ReservationStatus.CONFIRMED);

      // Verify booking on resource 2 is STILL CONFIRMED
      const updatedFutureBooking2 = await db.reservation.findUnique({
        where: { id: futureBookingRes2.id },
      });
      expect(updatedFutureBooking2?.status).toBe(ReservationStatus.CONFIRMED);
    });

    it("RETIRED keeps the history and cancels future bookings", async () => {
      const now = new Date();
      const pastStart = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      const pastEnd = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const futureStart = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const futureEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000);

      // Past booking
      const pastBooking = await db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: fixture.staffUser.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Historic test run",
          startAt: pastStart,
          endAt: pastEnd,
        },
      });

      // Future booking
      const futureBooking = await db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: fixture.staffUser.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Future test run",
          startAt: futureStart,
          endAt: futureEnd,
        },
      });

      const res = await changeStatus(
        colomboManager,
        fixture.resource1.id,
        ResourceStatus.RETIRED,
        "Decommissioned permanently",
      );

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.status).toBe(ResourceStatus.RETIRED);
      expect(res.data.cancelledBookingsCount).toBe(1);

      // Future booking is cancelled with reason
      const updatedFuture = await db.reservation.findUnique({
        where: { id: futureBooking.id },
      });
      expect(updatedFuture?.status).toBe(ReservationStatus.CANCELLED);
      expect(updatedFuture?.cancelReason).toBe("Resource retired: Decommissioned permanently");

      // Past booking history is preserved
      const updatedPast = await db.reservation.findUnique({
        where: { id: pastBooking.id },
      });
      expect(updatedPast?.status).toBe(ReservationStatus.CONFIRMED);
    });

    it("going back to ACTIVE cancels nothing", async () => {
      // First set to OUT_OF_SERVICE
      await changeStatus(
        colomboManager,
        fixture.resource1.id,
        ResourceStatus.OUT_OF_SERVICE,
        "Temporary filter check",
      );

      // Set back to ACTIVE
      const res = await changeStatus(colomboManager, fixture.resource1.id, ResourceStatus.ACTIVE);

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.status).toBe(ResourceStatus.ACTIVE);
      expect(res.data.cancelledBookingsCount).toBe(0);
      expect(res.message).toBe("Marked active");
    });
  });

  describe("Querying & Filtering", () => {
    it("listResources excludes RETIRED by default, matches search case-insensitively, and filters by site/category", async () => {
      // Retire resource 2
      await changeStatus(
        colomboManager,
        fixture.resource2.id,
        ResourceStatus.RETIRED,
        "Old instrument",
      );

      // Default query: should include resource1 and kandyResource, but NOT resource2
      const defaultList = await listResources({});
      expect(defaultList.ok).toBe(true);
      if (!defaultList.ok) return;
      const ids = defaultList.data.map((r) => r.id);
      expect(ids).toContain(fixture.resource1.id);
      expect(ids).toContain(kandyResource.id);
      expect(ids).not.toContain(fixture.resource2.id);

      // When filtering for RETIRED: should return resource2
      const retiredList = await listResources({ status: "RETIRED" });
      expect(retiredList.ok).toBe(true);
      if (!retiredList.ok) return;
      const retiredIds = retiredList.data.map((r) => r.id);
      expect(retiredIds).toContain(fixture.resource2.id);
      expect(retiredIds).not.toContain(fixture.resource1.id);

      // Search matches name case-insensitively
      const searchList = await listResources({ search: "cEnTrIfUgE" });
      expect(searchList.ok).toBe(true);
      if (!searchList.ok) return;
      expect(searchList.data.length).toBe(1);
      expect(searchList.data[0].id).toBe(kandyResource.id);

      // Filter by site
      const kandyList = await listResources({ siteId: kandySite.id });
      expect(kandyList.ok).toBe(true);
      if (!kandyList.ok) return;
      expect(kandyList.data.every((r) => r.siteId === kandySite.id)).toBe(true);
    });

    it("getResource loads category, site, section, upcoming 7 days bookings, and maintenance", async () => {
      const now = new Date();
      const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const inTwoDaysEnd = new Date(inTwoDays.getTime() + 2 * 60 * 60 * 1000);

      // Add a confirmed booking
      await db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: fixture.staffUser.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Upcoming sample run",
          startAt: inTwoDays,
          endAt: inTwoDaysEnd,
        },
      });

      // Add a maintenance block
      await db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: fixture.managerUser.id,
          kind: ReservationKind.MAINTENANCE,
          status: ReservationStatus.CONFIRMED,
          purpose: "Bi-monthly clean",
          startAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          endAt: new Date(now.getTime() - 20 * 60 * 60 * 1000),
        },
      });

      const res = await getResource(fixture.resource1.id);
      expect(res.ok).toBe(true);
      if (!res.ok || !res.data) return;

      expect(res.data.name).toBe(fixture.resource1.name);
      expect(res.data.category.id).toBe(fixture.category.id);
      expect(res.data.site.id).toBe(fixture.site.id);
      expect(res.data.section.id).toBe(fixture.section.id);
      expect(res.data.reservationsNext7Days.length).toBe(1);
      expect(res.data.reservationsNext7Days[0].purpose).toBe("Upcoming sample run");
      expect(res.data.recentMaintenance.length).toBe(1);
      expect(res.data.recentMaintenance[0].purpose).toBe("Bi-monthly clean");
    });
  });
});
