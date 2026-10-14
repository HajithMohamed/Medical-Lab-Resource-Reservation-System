import { describe, expect, it, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { resetDatabase, createTestData } from "../helpers/db";
import { getSiteDay, getResourceWeek, listCalendarOptions } from "@/services/calendar";
import {
  ResourceStatus,
  ReservationKind,
  ReservationStatus,
  Role,
} from "@/generated/prisma/client";
import { parseLabDateTime } from "@/lib/time";

describe("Calendar Service (Integration)", () => {
  let fixture: Awaited<ReturnType<typeof createTestData>>;
  let staff1: { id: string; name: string };
  let staff2: { id: string; name: string };
  let siteB: { id: string; name: string };
  let resourceB: { id: string; name: string };

  const zone = "Asia/Colombo";
  const testDate = "2026-10-15"; // Thursday

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestData();

    staff1 = { id: fixture.staffUser.id, name: fixture.staffUser.name };

    const u2 = await db.user.create({
      data: {
        name: "Amara Perera",
        email: "amara.perera@lab.example",
        passwordHash: "test-hash",
        role: Role.STAFF,
        siteId: fixture.site.id,
        mustChangePassword: false,
      },
    });
    staff2 = { id: u2.id, name: u2.name };

    // Create Site B and a resource in Site B
    siteB = await db.site.create({
      data: { name: "Kandy Laboratory" },
    });

    const sectionB = await db.section.create({
      data: { name: "Biochemistry B" },
    });

    resourceB = await db.resource.create({
      data: {
        name: "Spectrophotometer B",
        siteId: siteB.id,
        categoryId: fixture.category.id,
        sectionId: sectionB.id,
        status: ResourceStatus.ACTIVE,
      },
    });
  });

  it("excludes cancelled reservations and reservations from other sites", async () => {
    // 1. Confirmed booking at Site A
    const confirmedSiteA = await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: staff1.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "Confirmed Run Site A",
        startAt: parseLabDateTime(testDate, "10:00", zone),
        endAt: parseLabDateTime(testDate, "11:30", zone),
      },
    });

    // 2. Cancelled booking at Site A
    await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: staff1.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CANCELLED,
        cancelReason: "Cancelled test run",
        cancelledById: staff1.id,
        cancelledAt: new Date(),
        purpose: "Cancelled Run Site A",
        startAt: parseLabDateTime(testDate, "12:00", zone),
        endAt: parseLabDateTime(testDate, "13:00", zone),
      },
    });

    // 3. Confirmed booking at Site B
    await db.reservation.create({
      data: {
        resourceId: resourceB.id,
        createdById: staff1.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "Confirmed Run Site B",
        startAt: parseLabDateTime(testDate, "10:00", zone),
        endAt: parseLabDateTime(testDate, "11:00", zone),
      },
    });

    const result = await getSiteDay(staff1.id, fixture.site.id, testDate);

    // Only confirmedSiteA should be returned
    expect(result.reservations).toHaveLength(1);
    expect(result.reservations[0].id).toBe(confirmedSiteA.id);
    expect(result.reservations[0].purpose).toBe("Confirmed Run Site A");
  });

  it("includes an overnight run that started the previous day", async () => {
    // Overnight booking: 2026-10-14 22:00 to 2026-10-15 06:00
    const overnight = await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: staff1.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "Overnight Assay Batch",
        startAt: parseLabDateTime("2026-10-14", "22:00", zone),
        endAt: parseLabDateTime("2026-10-15", "06:00", zone),
      },
    });

    const result = await getSiteDay(staff1.id, fixture.site.id, testDate);

    const found = result.reservations.find((r) => r.id === overnight.id);
    expect(found).toBeDefined();
    expect(found?.purpose).toBe("Overnight Assay Batch");
  });

  it("leaves out RETIRED resources in both day view and week view", async () => {
    // Create a RETIRED resource at Site A
    const retiredResource = await db.resource.create({
      data: {
        name: "Decommissioned Centrifuge",
        siteId: fixture.site.id,
        categoryId: fixture.category.id,
        sectionId: fixture.section.id,
        status: ResourceStatus.RETIRED,
      },
    });

    // Update resource2 to OUT_OF_SERVICE to verify OUT_OF_SERVICE is included
    await db.resource.update({
      where: { id: fixture.resource2.id },
      data: { status: ResourceStatus.OUT_OF_SERVICE },
    });

    // Day view check
    const dayResult = await getSiteDay(staff1.id, fixture.site.id, testDate);
    const resourceNames = dayResult.resources.map((r) => r.name);

    expect(resourceNames).toContain(fixture.resource1.name);
    expect(resourceNames).toContain(fixture.resource2.name);
    expect(resourceNames).not.toContain("Decommissioned Centrifuge");

    // Week view check on RETIRED resource
    const weekResult = await getResourceWeek(staff1.id, retiredResource.id, testDate);
    expect(weekResult.resource).toBeNull();
    expect(weekResult.reservations).toHaveLength(0);
  });

  it("marks isMine true only for the viewer's own bookings", async () => {
    // Booking 1: created by staff1
    const res1 = await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: staff1.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "Staff 1 Analysis",
        startAt: parseLabDateTime(testDate, "09:00", zone),
        endAt: parseLabDateTime(testDate, "10:00", zone),
      },
    });

    // Booking 2: created by staff2
    const res2 = await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: staff2.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "Staff 2 QC Test",
        startAt: parseLabDateTime(testDate, "11:00", zone),
        endAt: parseLabDateTime(testDate, "12:00", zone),
      },
    });

    // When viewed by staff1:
    const viewAsStaff1 = await getSiteDay(staff1.id, fixture.site.id, testDate);
    const item1Viewer1 = viewAsStaff1.reservations.find((r) => r.id === res1.id);
    const item2Viewer1 = viewAsStaff1.reservations.find((r) => r.id === res2.id);

    expect(item1Viewer1?.isMine).toBe(true);
    expect(item2Viewer1?.isMine).toBe(false);

    // When viewed by staff2:
    const viewAsStaff2 = await getSiteDay(staff2.id, fixture.site.id, testDate);
    const item1Viewer2 = viewAsStaff2.reservations.find((r) => r.id === res1.id);
    const item2Viewer2 = viewAsStaff2.reservations.find((r) => r.id === res2.id);

    expect(item1Viewer2?.isMine).toBe(false);
    expect(item2Viewer2?.isMine).toBe(true);
  });

  it("getResourceWeek returns Monday to Sunday 7 days and week reservations", async () => {
    // 2026-10-15 is Thursday. The week is Mon 2026-10-12 to Sun 2026-10-18.
    const resMonday = await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: staff1.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "Monday Protocol",
        startAt: parseLabDateTime("2026-10-12", "08:00", zone),
        endAt: parseLabDateTime("2026-10-12", "10:00", zone),
      },
    });

    const resFriday = await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: staff1.id,
        kind: ReservationKind.MAINTENANCE,
        status: ReservationStatus.CONFIRMED,
        purpose: "Friday Scheduled Maintenance",
        startAt: parseLabDateTime("2026-10-16", "14:00", zone),
        endAt: parseLabDateTime("2026-10-16", "16:00", zone),
      },
    });

    const weekResult = await getResourceWeek(staff1.id, fixture.resource1.id, testDate);

    expect(weekResult.resource?.id).toBe(fixture.resource1.id);
    expect(weekResult.mondayDateString).toBe("2026-10-12");
    expect(weekResult.days).toHaveLength(7);
    expect(weekResult.days[0].dateString).toBe("2026-10-12");
    expect(weekResult.days[6].dateString).toBe("2026-10-18");

    const ids = weekResult.reservations.map((r) => r.id);
    expect(ids).toContain(resMonday.id);
    expect(ids).toContain(resFriday.id);
  });

  it("listCalendarOptions returns sites, categories, and resources", async () => {
    const options = await listCalendarOptions(fixture.site.id);
    expect(options.sites.length).toBeGreaterThanOrEqual(2);
    expect(options.categories.length).toBeGreaterThanOrEqual(1);
    expect(options.resources.length).toBeGreaterThanOrEqual(2);
  });
});
