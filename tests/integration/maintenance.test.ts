import { describe, expect, it, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { resetDatabase, createTestData } from "../helpers/db";
import {
  createMaintenanceBlock,
  endBlockNow,
  cancelBlock,
  listBlocks,
  listMaintenanceResources,
  findClashes,
} from "@/services/maintenance";
import { createBooking } from "@/services/bookings";
import {
  Role,
  ResourceStatus,
  ReservationKind,
  ReservationStatus,
} from "@/generated/prisma/client";
import { parseLabDateTime } from "@/lib/time";

describe("Maintenance Service (Integration)", () => {
  let fixture: Awaited<ReturnType<typeof createTestData>>;
  let adminActor: { id: string; role: Role; siteId: null; name: string };
  let managerA: { id: string; role: Role; siteId: string; name: string };
  let staffA: { id: string; role: Role; siteId: string; name: string };

  let siteB: { id: string; name: string };
  let managerB: { id: string; role: Role; siteId: string; name: string };
  let resourceB: { id: string; name: string; siteId: string };

  const testDate = "2026-10-20"; // Tuesday

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestData();

    managerA = {
      id: fixture.managerUser.id,
      role: Role.MANAGER,
      siteId: fixture.site.id,
      name: fixture.managerUser.name,
    };

    staffA = {
      id: fixture.staffUser.id,
      role: Role.STAFF,
      siteId: fixture.site.id,
      name: fixture.staffUser.name,
    };

    const adminUser = await db.user.create({
      data: {
        name: "Admin User",
        email: "admin@lab.example",
        passwordHash: "test-hash",
        role: Role.ADMIN,
        mustChangePassword: false,
      },
    });
    adminActor = {
      id: adminUser.id,
      role: Role.ADMIN,
      siteId: null,
      name: adminUser.name,
    };

    // Site B (Kandy) setup
    siteB = await db.site.create({
      data: { name: "Kandy Laboratory" },
    });

    const managerBUser = await db.user.create({
      data: {
        name: "Kandy Manager",
        email: "kandy.manager@lab.example",
        passwordHash: "test-hash",
        role: Role.MANAGER,
        siteId: siteB.id,
        mustChangePassword: false,
      },
    });
    managerB = {
      id: managerBUser.id,
      role: Role.MANAGER,
      siteId: siteB.id,
      name: managerBUser.name,
    };

    const sectionB = await db.section.create({
      data: { name: "Histology" },
    });

    const resB = await db.resource.create({
      data: {
        name: "Microtome Kandy",
        categoryId: fixture.category.id,
        siteId: siteB.id,
        sectionId: sectionB.id,
        status: ResourceStatus.ACTIVE,
      },
    });
    resourceB = { id: resB.id, name: resB.name, siteId: resB.siteId };
  });

  it("creates a maintenance block when there are no clashes", async () => {
    const startAt = parseLabDateTime(testDate, "09:00");
    const endAt = parseLabDateTime(testDate, "12:00");

    const result = await createMaintenanceBlock(managerA, {
      resourceId: fixture.resource1.id,
      startAt,
      endAt,
      reason: "Quarterly preventative maintenance",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.cancelledCount).toBe(0);
    expect(result.block.kind).toBe(ReservationKind.MAINTENANCE);
    expect(result.block.status).toBe(ReservationStatus.CONFIRMED);
    expect(result.block.purpose).toBe("Quarterly preventative maintenance");
    expect(result.block.createdById).toBe(managerA.id);

    const saved = await db.reservation.findUnique({ where: { id: result.block.id } });
    expect(saved).not.toBeNull();
  });

  it("returns needsConfirmation and does not create a block when bookings clash", async () => {
    // Create an existing confirmed booking 10:00 - 11:30
    const bookingStart = parseLabDateTime(testDate, "10:00");
    const bookingEnd = parseLabDateTime(testDate, "11:30");

    const bookingRes = await createBooking(staffA, {
      resourceId: fixture.resource1.id,
      startAt: bookingStart,
      endAt: bookingEnd,
      purpose: "Urgent biopsy examination",
    });
    expect(bookingRes.ok).toBe(true);

    // Try to create maintenance overlapping 09:00 - 12:00 without confirmation
    const maintStart = parseLabDateTime(testDate, "09:00");
    const maintEnd = parseLabDateTime(testDate, "12:00");

    const result = await createMaintenanceBlock(managerA, {
      resourceId: fixture.resource1.id,
      startAt: maintStart,
      endAt: maintEnd,
      reason: "Emergency sensor calibration",
      cancelClashingBookings: false,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.needsConfirmation).toBe(true);
    expect(result.clashes).toHaveLength(1);
    expect(result.clashes?.[0].purpose).toBe("Urgent biopsy examination");

    // Booking must still be CONFIRMED and no maintenance block created
    if (bookingRes.ok) {
      const bookingCheck = await db.reservation.findUnique({
        where: { id: bookingRes.data.id },
      });
      expect(bookingCheck?.status).toBe(ReservationStatus.CONFIRMED);
    }

    const blocksCount = await db.reservation.count({
      where: { kind: ReservationKind.MAINTENANCE },
    });
    expect(blocksCount).toBe(0);
  });

  it("with confirmation, exactly cancels clashing bookings with the reason, leaving others intact", async () => {
    // 1. Booking on same resource overlapping: 10:00 - 11:00
    const clashingRes = await createBooking(staffA, {
      resourceId: fixture.resource1.id,
      startAt: parseLabDateTime(testDate, "10:00"),
      endAt: parseLabDateTime(testDate, "11:00"),
      purpose: "Clashing sample run",
    });
    expect(clashingRes.ok).toBe(true);

    // 2. Booking on same resource NOT overlapping: 14:00 - 15:00
    const laterRes = await createBooking(staffA, {
      resourceId: fixture.resource1.id,
      startAt: parseLabDateTime(testDate, "14:00"),
      endAt: parseLabDateTime(testDate, "15:00"),
      purpose: "Later sample run",
    });
    expect(laterRes.ok).toBe(true);

    // 3. Booking on different resource (resource2) overlapping: 10:00 - 11:00
    const otherRes = await createBooking(staffA, {
      resourceId: fixture.resource2.id,
      startAt: parseLabDateTime(testDate, "10:00"),
      endAt: parseLabDateTime(testDate, "11:00"),
      purpose: "Other resource run",
    });
    expect(otherRes.ok).toBe(true);

    // Create maintenance with cancelClashingBookings: true
    const maintStart = parseLabDateTime(testDate, "09:00");
    const maintEnd = parseLabDateTime(testDate, "12:00");
    const reasonText = "Annual optical realignment";

    const result = await createMaintenanceBlock(managerA, {
      resourceId: fixture.resource1.id,
      startAt: maintStart,
      endAt: maintEnd,
      reason: reasonText,
      cancelClashingBookings: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.cancelledCount).toBe(1);

    // Verify clashing booking was cancelled with reason and cancelledBy
    if (clashingRes.ok) {
      const cancelledBooking = await db.reservation.findUnique({
        where: { id: clashingRes.data.id },
      });
      expect(cancelledBooking?.status).toBe(ReservationStatus.CANCELLED);
      expect(cancelledBooking?.cancelReason).toBe(`Maintenance: ${reasonText}`);
      expect(cancelledBooking?.cancelledById).toBe(managerA.id);
    }

    // Later booking on same resource must remain CONFIRMED
    if (laterRes.ok) {
      const laterBooking = await db.reservation.findUnique({
        where: { id: laterRes.data.id },
      });
      expect(laterBooking?.status).toBe(ReservationStatus.CONFIRMED);
    }

    // Other resource booking must remain CONFIRMED
    if (otherRes.ok) {
      const otherBooking = await db.reservation.findUnique({
        where: { id: otherRes.data.id },
      });
      expect(otherBooking?.status).toBe(ReservationStatus.CONFIRMED);
    }
  });

  it("a breakdown block that starts now cancels a booking in progress", async () => {
    // Current simulated fixed time: 10:15
    const nowSimulated = parseLabDateTime(testDate, "10:15");
    const slotStart = parseLabDateTime(testDate, "10:15");
    const slotEnd = parseLabDateTime(testDate, "11:00");

    // Booking in progress from 10:00 to 11:00
    const inProgressBooking = await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: staffA.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        startAt: parseLabDateTime(testDate, "10:00"),
        endAt: slotEnd,
        purpose: "Active centrifuge spin",
      },
    });

    // Breakdown block starting at start of current slot (10:15)
    const breakdownEnd = parseLabDateTime("2026-10-21", "10:15");

    const result = await createMaintenanceBlock(
      managerA,
      {
        resourceId: fixture.resource1.id,
        startAt: slotStart,
        endAt: breakdownEnd,
        reason: "Motor overheating",
        cancelClashingBookings: true,
      },
      "Asia/Colombo",
      nowSimulated,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.cancelledCount).toBe(1);

    const check = await db.reservation.findUnique({
      where: { id: inProgressBooking.id },
    });
    expect(check?.status).toBe(ReservationStatus.CANCELLED);
    expect(check?.cancelReason).toBe("Maintenance: Motor overheating");
    expect(check?.cancelledById).toBe(managerA.id);
  });

  it("is atomic: when maintenance creation overlaps with another block, no bookings are cancelled", async () => {
    const bookingStart = parseLabDateTime(testDate, "09:00");
    const bookingEnd = parseLabDateTime(testDate, "10:00");

    const booking = await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: staffA.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        startAt: bookingStart,
        endAt: bookingEnd,
        purpose: "Will survive rollback",
      },
    });

    // Directly create a competing MAINTENANCE block in the database overlapping the target window
    await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: adminActor.id,
        kind: ReservationKind.MAINTENANCE,
        status: ReservationStatus.CONFIRMED,
        startAt: parseLabDateTime(testDate, "10:00"),
        endAt: parseLabDateTime(testDate, "11:00"),
        purpose: "Existing concurrent maintenance",
      },
    });

    // Attempt to create a maintenance block that overlaps both (09:00 - 12:00)
    // The service findClashes step will detect the existing maintenance block and reject before cancelling
    const result = await createMaintenanceBlock(managerA, {
      resourceId: fixture.resource1.id,
      startAt: parseLabDateTime(testDate, "09:00"),
      endAt: parseLabDateTime(testDate, "12:00"),
      reason: "Hardware upgrade",
      cancelClashingBookings: true,
    });

    expect(result.ok).toBe(false);

    // The booking must NOT be cancelled
    const bookingCheck = await db.reservation.findUnique({ where: { id: booking.id } });
    expect(bookingCheck?.status).toBe(ReservationStatus.CONFIRMED);
  });

  it("enforces strict role boundaries and site scoping", async () => {
    const startAt = parseLabDateTime(testDate, "09:00");
    const endAt = parseLabDateTime(testDate, "12:00");

    // 1. Staff cannot create maintenance
    const staffAttempt = await createMaintenanceBlock(staffA, {
      resourceId: fixture.resource1.id,
      startAt,
      endAt,
      reason: "Staff attempting maintenance",
    });
    expect(staffAttempt.ok).toBe(false);
    if (!staffAttempt.ok) {
      expect(staffAttempt.error).toBe("Resource not found.");
    }

    // findClashes returns empty clashes for a free slot
    const clashesCheck = await findClashes(managerA, fixture.resource1.id, startAt, endAt);
    expect(clashesCheck.ok).toBe(true);
    if (clashesCheck.ok) {
      expect(clashesCheck.bookings).toHaveLength(0);
    }

    // 2. Kandy Manager cannot create maintenance for Colombo resource
    const wrongManagerAttempt = await createMaintenanceBlock(managerB, {
      resourceId: fixture.resource1.id,
      startAt,
      endAt,
      reason: "Kandy manager on Colombo resource",
    });
    expect(wrongManagerAttempt.ok).toBe(false);
    if (!wrongManagerAttempt.ok) {
      expect(wrongManagerAttempt.error).toBe("Resource not found.");
    }

    // 3. Admin CAN create maintenance on Colombo AND Kandy resources
    const adminColombo = await createMaintenanceBlock(adminActor, {
      resourceId: fixture.resource1.id,
      startAt,
      endAt,
      reason: "Admin maintenance Colombo",
    });
    expect(adminColombo.ok).toBe(true);

    const adminKandy = await createMaintenanceBlock(adminActor, {
      resourceId: resourceB.id,
      startAt,
      endAt,
      reason: "Admin maintenance Kandy",
    });
    expect(adminKandy.ok).toBe(true);

    // 4. listBlocks for Kandy Manager never contains Colombo blocks, even if siteId=<Colombo> is passed
    const kandyList = await listBlocks(managerB, {
      siteId: fixture.site.id,
      range: "upcoming",
    });
    expect(kandyList.blocks).toHaveLength(1);
    expect(kandyList.blocks[0].resourceId).toBe(resourceB.id);

    // 5. listMaintenanceResources returns only own site resources for manager
    const managerResources = await listMaintenanceResources(managerB);
    expect(managerResources.every((r) => r.siteId === siteB.id)).toBe(true);

    const adminResources = await listMaintenanceResources(adminActor);
    expect(adminResources.some((r) => r.siteId === fixture.site.id)).toBe(true);
    expect(adminResources.some((r) => r.siteId === siteB.id)).toBe(true);
  });

  it("the database refuses a booking inside a maintenance block", async () => {
    // Create maintenance block 09:00 - 12:00
    const maintRes = await createMaintenanceBlock(managerA, {
      resourceId: fixture.resource1.id,
      startAt: parseLabDateTime(testDate, "09:00"),
      endAt: parseLabDateTime(testDate, "12:00"),
      reason: "Scheduled engineering service",
    });
    expect(maintRes.ok).toBe(true);

    // Attempt booking 10:00 - 11:00 inside the block
    const bookingAttempt = await createBooking(staffA, {
      resourceId: fixture.resource1.id,
      startAt: parseLabDateTime(testDate, "10:00"),
      endAt: parseLabDateTime(testDate, "11:00"),
      purpose: "Attempting to book during maintenance",
    });

    expect(bookingAttempt.ok).toBe(false);
    if (!bookingAttempt.ok) {
      expect(bookingAttempt.error).toContain("clashes with maintenance");
    }
  });

  it("endBlockNow shortens a running block, freeing future time", async () => {
    // Maintenance running from 08:00 to 14:00
    const blockStart = parseLabDateTime(testDate, "08:00");
    const blockEnd = parseLabDateTime(testDate, "14:00");

    const blockRes = await createMaintenanceBlock(managerA, {
      resourceId: fixture.resource1.id,
      startAt: blockStart,
      endAt: blockEnd,
      reason: "Service run",
    });
    expect(blockRes.ok).toBe(true);
    if (!blockRes.ok) return;

    // Simulate now = 09:10
    const nowSimulated = parseLabDateTime(testDate, "09:10");

    const endRes = await endBlockNow(managerA, blockRes.block.id, "Asia/Colombo", nowSimulated);
    expect(endRes.ok).toBe(true);

    // End time should be rounded up to next slot (09:15)
    const updated = await db.reservation.findUnique({
      where: { id: blockRes.block.id },
    });
    expect(updated?.endAt.getTime()).toBe(parseLabDateTime(testDate, "09:15").getTime());

    // Slot 10:00 - 11:00 is now free for booking!
    const bookingRes = await createBooking(staffA, {
      resourceId: fixture.resource1.id,
      startAt: parseLabDateTime(testDate, "10:00"),
      endAt: parseLabDateTime(testDate, "11:00"),
      purpose: "Booked in newly freed slot",
    });
    expect(bookingRes.ok).toBe(true);
  });

  it("cancelling a future block frees the time for bookings", async () => {
    const blockStart = parseLabDateTime(testDate, "13:00");
    const blockEnd = parseLabDateTime(testDate, "16:00");

    const blockRes = await createMaintenanceBlock(managerA, {
      resourceId: fixture.resource1.id,
      startAt: blockStart,
      endAt: blockEnd,
      reason: "Future inspection",
    });
    expect(blockRes.ok).toBe(true);
    if (!blockRes.ok) return;

    // Now simulated at 08:00 (before start)
    const nowSimulated = parseLabDateTime(testDate, "08:00");

    const cancelRes = await cancelBlock(
      managerA,
      blockRes.block.id,
      "Inspection postponed",
      nowSimulated,
    );
    expect(cancelRes.ok).toBe(true);

    const updated = await db.reservation.findUnique({
      where: { id: blockRes.block.id },
    });
    expect(updated?.status).toBe(ReservationStatus.CANCELLED);
    expect(updated?.cancelReason).toBe("Inspection postponed");

    // Can now book inside 13:00 - 15:00!
    const bookingRes = await createBooking(staffA, {
      resourceId: fixture.resource1.id,
      startAt: parseLabDateTime(testDate, "13:00"),
      endAt: parseLabDateTime(testDate, "15:00"),
      purpose: "Booked after block cancelled",
    });
    expect(bookingRes.ok).toBe(true);
  });
});
