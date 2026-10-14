import { describe, expect, it, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { resetDatabase, createTestData } from "../helpers/db";
import { findSlots } from "@/services/availability";
import { createBooking } from "@/services/bookings";
import {
  Role,
  ResourceStatus,
  ReservationKind,
  ReservationStatus,
} from "@/generated/prisma/client";
import { labToday, addLabDays, parseLabDateTime } from "@/lib/time";

describe("Availability / Find a Slot Service (Integration)", () => {
  let fixture: Awaited<ReturnType<typeof createTestData>>;
  let staffUser: { id: string; role: Role; siteId: string; name: string };
  let adminUser: { id: string; role: Role; siteId: null; name: string };
  let roomCategory: { id: string; name: string };
  let roomResource: { id: string; name: string; capacity: number | null };
  let testDate: string;

  const zone = "Asia/Colombo";

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestData();

    testDate = addLabDays(labToday(zone), 3, zone);

    staffUser = {
      id: fixture.staffUser.id,
      role: Role.STAFF,
      siteId: fixture.site.id,
      name: fixture.staffUser.name,
    };

    const admin = await db.user.create({
      data: {
        name: "Admin User",
        email: "admin.test@lab.example",
        passwordHash: "test-hash",
        role: Role.ADMIN,
        mustChangePassword: false,
      },
    });

    adminUser = {
      id: admin.id,
      role: Role.ADMIN,
      siteId: null,
      name: admin.name,
    };

    roomCategory = await db.category.create({
      data: {
        name: "Conference Rooms",
        maxBookingMinutes: 480,
        iconKey: "room",
      },
    });

    roomResource = await db.resource.create({
      data: {
        name: "Meeting Room Alpha",
        categoryId: roomCategory.id,
        siteId: fixture.site.id,
        sectionId: fixture.section.id,
        capacity: 10,
        status: ResourceStatus.ACTIVE,
      },
    });
  });

  it("reports a free resource as AVAILABLE", async () => {
    const result = await findSlots(staffUser, {
      date: testDate,
      start: "10:00",
      duration: 60,
      siteId: fixture.site.id,
    });

    const item1 = result.items.find((i) => i.id === fixture.resource1.id);
    expect(item1).toBeDefined();
    expect(item1?.state).toBe("AVAILABLE");
    expect(result.counts.available).toBeGreaterThanOrEqual(1);
  });

  it("reports a resource with an overlapping confirmed booking as BUSY with suggestions", async () => {
    const startAt = parseLabDateTime(testDate, "10:00", zone);
    const endAt = parseLabDateTime(testDate, "12:00", zone);

    await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: staffUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "Urgent Diagnostic Run",
        startAt,
        endAt,
      },
    });

    // Query 10:30 to 11:30 (overlaps [10:00, 12:00))
    const result = await findSlots(staffUser, {
      date: testDate,
      start: "10:30",
      duration: 60,
      siteId: fixture.site.id,
    });

    const item1 = result.items.find((i) => i.id === fixture.resource1.id);
    expect(item1).toBeDefined();
    expect(item1?.state).toBe("BUSY");
    expect(item1?.stateReason).toContain("Booked 10:00 to 12:00");
    expect(item1?.suggestions.length).toBeGreaterThan(0);
    // Nearest free suggestions should include 12:00
    expect(item1?.suggestions.some((s) => s.startTimeStr === "12:00")).toBe(true);
  });

  it("a CANCELLED booking does not make a resource busy", async () => {
    const startAt = parseLabDateTime(testDate, "10:00", zone);
    const endAt = parseLabDateTime(testDate, "12:00", zone);

    await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: staffUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CANCELLED,
        cancelReason: "Equipment calibrated early",
        cancelledAt: new Date(),
        cancelledById: staffUser.id,
        purpose: "Cancelled Run",
        startAt,
        endAt,
      },
    });

    const result = await findSlots(staffUser, {
      date: testDate,
      start: "10:00",
      duration: 60,
      siteId: fixture.site.id,
    });

    const item1 = result.items.find((i) => i.id === fixture.resource1.id);
    expect(item1?.state).toBe("AVAILABLE");
  });

  it("a MAINTENANCE block marks a resource as BUSY", async () => {
    const startAt = parseLabDateTime(testDate, "14:00", zone);
    const endAt = parseLabDateTime(testDate, "16:00", zone);

    await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: fixture.managerUser.id,
        kind: ReservationKind.MAINTENANCE,
        status: ReservationStatus.CONFIRMED,
        purpose: "Quarterly Laser Calibration",
        startAt,
        endAt,
      },
    });

    const result = await findSlots(staffUser, {
      date: testDate,
      start: "14:30",
      duration: 60,
      siteId: fixture.site.id,
    });

    const item1 = result.items.find((i) => i.id === fixture.resource1.id);
    expect(item1?.state).toBe("BUSY");
    expect(item1?.stateReason).toContain("Booked 14:00 to 16:00");
  });

  it("correctly identifies OUT_OF_SERVICE, TOO_LONG, and TOO_SMALL states", async () => {
    // 1. OUT_OF_SERVICE
    await db.resource.update({
      where: { id: fixture.resource2.id },
      data: { status: ResourceStatus.OUT_OF_SERVICE },
    });

    // 2. TOO_LONG: duration > maxBookingMinutes (fixture.category has maxBookingMinutes = 240)
    // 3. TOO_SMALL: roomResource has capacity = 10, search for 25 people
    const result = await findSlots(staffUser, {
      date: testDate,
      start: "09:00",
      duration: 360, // 6 hours > 4 hours
      people: 25,
      siteId: fixture.site.id,
    });

    const r2 = result.items.find((i) => i.id === fixture.resource2.id);
    expect(r2?.state).toBe("OUT_OF_SERVICE");

    const r1 = result.items.find((i) => i.id === fixture.resource1.id);
    expect(r1?.state).toBe("TOO_LONG");

    const room = result.items.find((i) => i.id === roomResource.id);
    expect(room?.state).toBe("TOO_SMALL");
    expect(room?.stateReason).toBe("Seats 10");
  });

  it("RETIRED resources are never listed", async () => {
    await db.resource.create({
      data: {
        name: "Old Decommissioned Centrifuge",
        categoryId: fixture.category.id,
        siteId: fixture.site.id,
        sectionId: fixture.section.id,
        status: ResourceStatus.RETIRED,
      },
    });

    const result = await findSlots(staffUser, {
      date: testDate,
      siteId: "any",
    });

    expect(result.items.some((i) => i.name === "Old Decommissioned Centrifuge")).toBe(false);
  });

  it("filters accurately by site, category, section, people, and name query", async () => {
    const siteB = await db.site.create({
      data: { name: "Branch Lab B" },
    });
    const resB = await db.resource.create({
      data: {
        name: "Branch Spectrometer",
        categoryId: fixture.category.id,
        siteId: siteB.id,
        sectionId: fixture.section.id,
        status: ResourceStatus.ACTIVE,
      },
    });

    // Filter by site B
    const siteResult = await findSlots(staffUser, {
      date: testDate,
      siteId: siteB.id,
    });
    expect(siteResult.items.every((i) => i.site.id === siteB.id)).toBe(true);
    expect(siteResult.items.some((i) => i.id === resB.id)).toBe(true);

    // Filter by name query
    const qResult = await findSlots(staffUser, {
      date: testDate,
      siteId: "any",
      q: "spectrometer",
    });
    expect(qResult.items.length).toBe(1);
    expect(qResult.items[0].id).toBe(resB.id);

    // Filter by category
    const catResult = await findSlots(staffUser, {
      date: testDate,
      siteId: "any",
      categoryId: roomCategory.id,
    });
    expect(catResult.items.every((i) => i.category.id === roomCategory.id)).toBe(true);
  });

  it("defaults site to actor's home site for STAFF and 'any' for ADMIN", async () => {
    const staffResult = await findSlots(staffUser, { date: testDate });
    expect(staffResult.query.siteId).toBe(staffUser.siteId);

    const adminResult = await findSlots(adminUser, { date: testDate });
    expect(adminResult.query.siteId).toBe("any");
  });

  it("falls back to default values for invalid queries without throwing", async () => {
    const result = await findSlots(staffUser, {
      date: "invalid-date-string",
      start: "99:99",
      duration: 9999,
      people: -5,
    });

    expect(result.query.date).toBe(labToday(zone));
    expect(result.query.duration).toBe(60);
    expect(result.query.people).toBeUndefined();
    expect(result.note).toBeDefined();
  });

  it("lost race: second booking gets friendly clash result with suggestions", async () => {
    const startAt = parseLabDateTime(testDate, "14:00", zone);
    const endAt = parseLabDateTime(testDate, "15:00", zone);

    // User 1 books first
    const res1 = await createBooking(staffUser, {
      resourceId: fixture.resource1.id,
      startAt,
      endAt,
      purpose: "User 1 Booking",
    });
    expect(res1.ok).toBe(true);

    // User 2 attempts same slot
    const res2 = await createBooking(staffUser, {
      resourceId: fixture.resource1.id,
      startAt,
      endAt,
      purpose: "User 2 Concurrent Race Booking",
    });

    expect(res2.ok).toBe(false);
    if (!res2.ok) {
      expect(res2.error).toContain(fixture.staffUser.name);
    }
  });
});
