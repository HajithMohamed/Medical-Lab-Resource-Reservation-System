import { describe, expect, it, beforeEach } from "vitest";
import { addDays, subDays } from "date-fns";
import { db } from "@/lib/db";
import { resetDatabase, createTestData } from "../helpers/db";
import { createBooking, cancelBooking, getReservation, listMyBookings } from "@/services/bookings";
import {
  Role,
  ResourceStatus,
  ReservationKind,
  ReservationStatus,
} from "@/generated/prisma/client";
import { parseLabDateTime } from "@/lib/time";

describe("Bookings Service (Integration)", () => {
  let fixture: Awaited<ReturnType<typeof createTestData>>;
  let staffUser1: { id: string; role: Role; siteId: string; name: string };
  let staffUser2: { id: string; role: Role; siteId: string; name: string };
  let siteAManager: { id: string; role: Role; siteId: string; name: string };
  let siteBManager: { id: string; role: Role; siteId: string; name: string };
  let siteB: { id: string; name: string };
  let roomResource: { id: string; name: string; capacity: number | null };

  const zone = "Asia/Colombo";

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestData();

    // Staff 1
    staffUser1 = {
      id: fixture.staffUser.id,
      role: Role.STAFF,
      siteId: fixture.site.id,
      name: fixture.staffUser.name,
    };

    // Staff 2 at same site
    const u2 = await db.user.create({
      data: {
        name: "Kasun Silva",
        email: "kasun.silva@lab.example",
        passwordHash: "test-hash",
        role: Role.STAFF,
        siteId: fixture.site.id,
        mustChangePassword: false,
      },
    });
    staffUser2 = {
      id: u2.id,
      role: Role.STAFF,
      siteId: fixture.site.id,
      name: u2.name,
    };

    // Manager for Site A
    siteAManager = {
      id: fixture.managerUser.id,
      role: Role.MANAGER,
      siteId: fixture.site.id,
      name: fixture.managerUser.name,
    };

    // Site B and Manager for Site B
    siteB = await db.site.create({
      data: { name: "Kandy Branch Lab", address: "456 Hill St" },
    });
    const mB = await db.user.create({
      data: {
        name: "Kandy Manager",
        email: "kandy.manager@lab.example",
        passwordHash: "test-hash",
        role: Role.MANAGER,
        siteId: siteB.id,
        mustChangePassword: false,
      },
    });
    siteBManager = {
      id: mB.id,
      role: Role.MANAGER,
      siteId: siteB.id,
      name: mB.name,
    };

    // Room with capacity
    const roomCat = await db.category.create({
      data: {
        name: "Meeting Rooms",
        maxBookingMinutes: 480, // 8 hours
        iconKey: "room",
      },
    });
    const room = await db.resource.create({
      data: {
        name: "Seminar Room A",
        categoryId: roomCat.id,
        siteId: fixture.site.id,
        sectionId: fixture.section.id,
        capacity: 20,
        status: ResourceStatus.ACTIVE,
      },
    });
    roomResource = {
      id: room.id,
      name: room.name,
      capacity: room.capacity,
    };
  });

  it("books a free slot successfully", async () => {
    const futureDate = addDays(new Date(), 2);
    const dateStr = futureDate.toISOString().slice(0, 10);
    const startAt = parseLabDateTime(dateStr, "10:00", zone);
    const endAt = parseLabDateTime(dateStr, "12:00", zone);

    const result = await createBooking(staffUser1, {
      resourceId: fixture.resource1.id,
      startAt,
      endAt,
      purpose: "HbA1c calibration batch",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe(ReservationStatus.CONFIRMED);
      expect(result.data.kind).toBe(ReservationKind.BOOKING);
      expect(result.data.purpose).toBe("HbA1c calibration batch");
    }
  });

  it("refuses a clash with a booking and names the person", async () => {
    const futureDate = addDays(new Date(), 3);
    const dateStr = futureDate.toISOString().slice(0, 10);
    const startAt = parseLabDateTime(dateStr, "10:00", zone);
    const endAt = parseLabDateTime(dateStr, "12:00", zone);

    // Kasun Silva books 10:00 to 12:00
    const first = await createBooking(staffUser2, {
      resourceId: fixture.resource1.id,
      startAt,
      endAt,
      purpose: "PCR electrophoresis run",
    });
    expect(first.ok).toBe(true);

    // Staff 1 tries overlapping 11:00 to 13:00
    const overlapStart = parseLabDateTime(dateStr, "11:00", zone);
    const overlapEnd = parseLabDateTime(dateStr, "13:00", zone);

    const clash = await createBooking(staffUser1, {
      resourceId: fixture.resource1.id,
      startAt: overlapStart,
      endAt: overlapEnd,
      purpose: "Routine blood counts",
    });

    expect(clash.ok).toBe(false);
    if (!clash.ok) {
      expect(clash.error).toContain("Kasun Silva");
      expect(clash.error).toContain("This time clashes with Kasun Silva's booking");
    }
  });

  it("refuses a clash with maintenance", async () => {
    const futureDate = addDays(new Date(), 4);
    const dateStr = futureDate.toISOString().slice(0, 10);
    const startAt = parseLabDateTime(dateStr, "14:00", zone);
    const endAt = parseLabDateTime(dateStr, "16:00", zone);

    // Seed a maintenance block
    await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: siteAManager.id,
        kind: ReservationKind.MAINTENANCE,
        status: ReservationStatus.CONFIRMED,
        purpose: "Annual calibration",
        startAt,
        endAt,
      },
    });

    // Staff tries to book overlapping slot 15:00 to 17:00
    const overlapStart = parseLabDateTime(dateStr, "15:00", zone);
    const overlapEnd = parseLabDateTime(dateStr, "17:00", zone);

    const clash = await createBooking(staffUser1, {
      resourceId: fixture.resource1.id,
      startAt: overlapStart,
      endAt: overlapEnd,
      purpose: "Afternoon run",
    });

    expect(clash.ok).toBe(false);
    if (!clash.ok) {
      expect(clash.error).toContain("maintenance (Annual calibration)");
    }
  });

  it("allows back-to-back bookings (e.g. 10:00-11:00 and 11:00-12:00)", async () => {
    const futureDate = addDays(new Date(), 5);
    const dateStr = futureDate.toISOString().slice(0, 10);
    const t1Start = parseLabDateTime(dateStr, "10:00", zone);
    const t1End = parseLabDateTime(dateStr, "11:00", zone);
    const t2Start = parseLabDateTime(dateStr, "11:00", zone);
    const t2End = parseLabDateTime(dateStr, "12:00", zone);

    const book1 = await createBooking(staffUser1, {
      resourceId: fixture.resource1.id,
      startAt: t1Start,
      endAt: t1End,
      purpose: "Morning Slot",
    });
    expect(book1.ok).toBe(true);

    const book2 = await createBooking(staffUser2, {
      resourceId: fixture.resource1.id,
      startAt: t2Start,
      endAt: t2End,
      purpose: "Back to back slot",
    });
    expect(book2.ok).toBe(true);
  });

  it("refuses OUT_OF_SERVICE and RETIRED resources", async () => {
    const futureDate = addDays(new Date(), 6);
    const dateStr = futureDate.toISOString().slice(0, 10);
    const startAt = parseLabDateTime(dateStr, "10:00", zone);
    const endAt = parseLabDateTime(dateStr, "11:00", zone);

    // OUT_OF_SERVICE resource
    const oos = await db.resource.create({
      data: {
        name: "Broken Centrifuge",
        categoryId: fixture.category.id,
        siteId: fixture.site.id,
        sectionId: fixture.section.id,
        status: ResourceStatus.OUT_OF_SERVICE,
      },
    });

    const resOos = await createBooking(staffUser1, {
      resourceId: oos.id,
      startAt,
      endAt,
      purpose: "Attempt on broken machine",
    });
    expect(resOos.ok).toBe(false);
    if (!resOos.ok) {
      expect(resOos.error).toBe("This resource is out of service.");
    }

    // RETIRED resource
    const retired = await db.resource.create({
      data: {
        name: "Old Autoclave",
        categoryId: fixture.category.id,
        siteId: fixture.site.id,
        sectionId: fixture.section.id,
        status: ResourceStatus.RETIRED,
      },
    });

    const resRet = await createBooking(staffUser1, {
      resourceId: retired.id,
      startAt,
      endAt,
      purpose: "Attempt on retired machine",
    });
    expect(resRet.ok).toBe(false);
    if (!resRet.ok) {
      expect(resRet.error).toBe("This resource has been retired.");
    }
  });

  it("refuses a past time, a booking that is too long, a start beyond booking window, room without attendees and over capacity", async () => {
    const pastStart = subDays(new Date(), 2);
    const pastEnd = subDays(new Date(), 2);
    pastStart.setHours(10, 0, 0, 0);
    pastEnd.setHours(11, 0, 0, 0);

    // Past time
    const pastRes = await createBooking(staffUser1, {
      resourceId: fixture.resource1.id,
      startAt: pastStart,
      endAt: pastEnd,
      purpose: "Booking in past",
    });
    expect(pastRes.ok).toBe(false);
    if (!pastRes.ok) {
      expect(pastRes.error).toBe("You can't book a time that has already passed.");
    }

    // Booking too long (fixture category is max 240 min = 4 hours)
    const futureDate = addDays(new Date(), 2);
    const dateStr = futureDate.toISOString().slice(0, 10);
    const startAt = parseLabDateTime(dateStr, "10:00", zone);
    const tooLongEnd = parseLabDateTime(dateStr, "15:00", zone); // 5 hours > 4 hours

    const longRes = await createBooking(staffUser1, {
      resourceId: fixture.resource1.id,
      startAt,
      endAt: tooLongEnd,
      purpose: "5 hour run",
    });
    expect(longRes.ok).toBe(false);
    if (!longRes.ok) {
      expect(longRes.error).toBe("Bookings for this resource can be at most 4 hours.");
    }

    // Beyond booking window (65 days)
    const wayFutureDate = addDays(new Date(), 65);
    const wayDateStr = wayFutureDate.toISOString().slice(0, 10);
    const wayStart = parseLabDateTime(wayDateStr, "10:00", zone);
    const wayEnd = parseLabDateTime(wayDateStr, "11:00", zone);

    const windowRes = await createBooking(staffUser1, {
      resourceId: fixture.resource1.id,
      startAt: wayStart,
      endAt: wayEnd,
      purpose: "Far future booking",
    });
    expect(windowRes.ok).toBe(false);
    if (!windowRes.ok) {
      expect(windowRes.error).toBe("Bookings can be made at most 60 days in advance.");
    }

    // Room without attendees
    const roomStart = parseLabDateTime(dateStr, "10:00", zone);
    const roomEnd = parseLabDateTime(dateStr, "11:00", zone);

    const noAttendeesRes = await createBooking(staffUser1, {
      resourceId: roomResource.id,
      startAt: roomStart,
      endAt: roomEnd,
      purpose: "Department meeting",
    });
    expect(noAttendeesRes.ok).toBe(false);
    if (!noAttendeesRes.ok) {
      expect(noAttendeesRes.error).toBe("This room holds up to 20 people.");
    }

    // Room over capacity (25 > 20)
    const overCapacityRes = await createBooking(staffUser1, {
      resourceId: roomResource.id,
      startAt: roomStart,
      endAt: roomEnd,
      purpose: "Huge group meeting",
      attendeeCount: 25,
    });
    expect(overCapacityRes.ok).toBe(false);
    if (!overCapacityRes.ok) {
      expect(overCapacityRes.error).toBe("This room holds up to 20 people.");
    }
  });

  it("two people at the same moment: 5 createBooking calls in parallel give exactly 1 success and 4 clash messages", async () => {
    const futureDate = addDays(new Date(), 7);
    const dateStr = futureDate.toISOString().slice(0, 10);
    const startAt = parseLabDateTime(dateStr, "10:00", zone);
    const endAt = parseLabDateTime(dateStr, "12:00", zone);

    // Fire 5 booking calls concurrently for the exact same slot and resource
    const promises = [
      createBooking(staffUser1, {
        resourceId: fixture.resource1.id,
        startAt,
        endAt,
        purpose: "Batch A",
      }),
      createBooking(staffUser2, {
        resourceId: fixture.resource1.id,
        startAt,
        endAt,
        purpose: "Batch B",
      }),
      createBooking(staffUser1, {
        resourceId: fixture.resource1.id,
        startAt,
        endAt,
        purpose: "Batch C",
      }),
      createBooking(staffUser2, {
        resourceId: fixture.resource1.id,
        startAt,
        endAt,
        purpose: "Batch D",
      }),
      createBooking(staffUser1, {
        resourceId: fixture.resource1.id,
        startAt,
        endAt,
        purpose: "Batch E",
      }),
    ];

    const results = await Promise.all(promises);

    const successes = results.filter((r) => r.ok === true);
    const failures = results.filter((r) => r.ok === false);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(4);

    // Each failure should return a friendly clash message or conflict error, never an unhandled DB exception
    for (const fail of failures) {
      if (!fail.ok) {
        expect(
          fail.error.includes("clashes with") ||
            fail.error.includes("Someone booked this time a moment ago"),
        ).toBe(true);
      }
    }
  });

  describe("cancellation workflow and permissions", () => {
    let bookingToCancel: { id: string };

    beforeEach(async () => {
      const futureDate = addDays(new Date(), 3);
      const dateStr = futureDate.toISOString().slice(0, 10);
      const startAt = parseLabDateTime(dateStr, "10:00", zone);
      const endAt = parseLabDateTime(dateStr, "12:00", zone);

      const res = await createBooking(staffUser1, {
        resourceId: fixture.resource1.id,
        startAt,
        endAt,
        purpose: "Preparation run",
      });
      if (!res.ok) throw new Error("Failed to set up booking fixture");
      bookingToCancel = res.data;
    });

    it("staff can cancel their own booking", async () => {
      const result = await cancelBooking(
        staffUser1,
        bookingToCancel.id,
        "Samples delayed by courier",
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.status).toBe(ReservationStatus.CANCELLED);
        expect(result.data.cancelReason).toBe("Samples delayed by courier");
        expect(result.data.cancelledById).toBe(staffUser1.id);
      }
    });

    it("staff cannot cancel someone else's booking", async () => {
      const result = await cancelBooking(staffUser2, bookingToCancel.id, "Want to take this slot");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not authorized");
      }
    });

    it("the site's manager can cancel a booking at their site", async () => {
      const result = await cancelBooking(
        siteAManager,
        bookingToCancel.id,
        "Emergency calibration needed",
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.status).toBe(ReservationStatus.CANCELLED);
        expect(result.data.cancelledById).toBe(siteAManager.id);
      }
    });

    it("a manager of another site cannot cancel this booking", async () => {
      const result = await cancelBooking(
        siteBManager,
        bookingToCancel.id,
        "Attempted cross-site cancel",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not authorized");
      }
    });

    it("a booking that has already started cannot be cancelled", async () => {
      // Create a started booking directly in db
      const started = await db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: staffUser1.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Currently running test",
          startAt: subDays(new Date(), 1),
          endAt: addDays(new Date(), 1),
        },
      });

      const res = await cancelBooking(staffUser1, started.id, "Want to stop running test");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("already started");
      }
    });

    it("a cancelled booking frees the slot for a new one", async () => {
      const futureDate = addDays(new Date(), 3);
      const dateStr = futureDate.toISOString().slice(0, 10);
      const startAt = parseLabDateTime(dateStr, "10:00", zone);
      const endAt = parseLabDateTime(dateStr, "12:00", zone);

      // Cancel original booking
      await cancelBooking(staffUser1, bookingToCancel.id, "Cancelling to free slot");

      // Staff 2 can now book the exact same slot
      const newBooking = await createBooking(staffUser2, {
        resourceId: fixture.resource1.id,
        startAt,
        endAt,
        purpose: "Taking freed slot",
      });

      expect(newBooking.ok).toBe(true);
      if (newBooking.ok) {
        expect(newBooking.data.status).toBe(ReservationStatus.CONFIRMED);
      }
    });
  });

  describe("listMyBookings and getReservation", () => {
    it("returns upcoming, past, and cancelled lists correctly", async () => {
      const now = new Date();

      // 1. Upcoming booking
      const upStart = addDays(now, 1);
      const upEnd = addDays(now, 1);
      upStart.setHours(10, 0, 0, 0);
      upEnd.setHours(11, 0, 0, 0);
      await db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: staffUser1.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Upcoming test",
          startAt: upStart,
          endAt: upEnd,
        },
      });

      // 2. Past booking
      const pastStart = subDays(now, 2);
      const pastEnd = subDays(now, 2);
      pastStart.setHours(10, 0, 0, 0);
      pastEnd.setHours(11, 0, 0, 0);
      await db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: staffUser1.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Past completed test",
          startAt: pastStart,
          endAt: pastEnd,
        },
      });

      // 3. Cancelled booking
      const cancelStart = addDays(now, 2);
      const cancelEnd = addDays(now, 2);
      cancelStart.setHours(14, 0, 0, 0);
      cancelEnd.setHours(15, 0, 0, 0);
      await db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: staffUser1.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CANCELLED,
          purpose: "Cancelled test",
          startAt: cancelStart,
          endAt: cancelEnd,
          cancelReason: "Equipment error",
          cancelledAt: now,
          cancelledById: siteAManager.id,
        },
      });

      const { upcoming, past, cancelled } = await listMyBookings(staffUser1, now);

      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].purpose).toBe("Upcoming test");

      expect(past).toHaveLength(1);
      expect(past[0].purpose).toBe("Past completed test");

      expect(cancelled).toHaveLength(1);
      expect(cancelled[0].purpose).toBe("Cancelled test");
      expect(cancelled[0].cancelledBy?.name).toBe(siteAManager.name);
    });

    it("getReservation returns reservation with relation details", async () => {
      const futureDate = addDays(new Date(), 2);
      const dateStr = futureDate.toISOString().slice(0, 10);
      const startAt = parseLabDateTime(dateStr, "10:00", zone);
      const endAt = parseLabDateTime(dateStr, "11:00", zone);

      const created = await createBooking(staffUser1, {
        resourceId: fixture.resource1.id,
        startAt,
        endAt,
        purpose: "PCR detailed view test",
      });
      if (!created.ok) throw new Error("Creation failed");

      const res = await getReservation(created.data.id);
      expect(res).not.toBeNull();
      expect(res?.resource.name).toBe(fixture.resource1.name);
      expect(res?.createdBy.name).toBe(staffUser1.name);
      expect(res?.resource.site.name).toBe(fixture.site.name);
    });
  });
});
