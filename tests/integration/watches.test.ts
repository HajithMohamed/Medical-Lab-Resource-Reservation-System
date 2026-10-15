import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { resetDatabase, createTestData, makeTestTime } from "../helpers/db";
import {
  Role,
  ReservationKind,
  ReservationStatus,
  ResourceStatus,
  ResourceWatchKind,
  ResourceWatchStatus,
  NotificationKind,
} from "@/generated/prisma/client";
import {
  createWatch,
  listMyWatches,
  cancelMyWatch,
  checkWatchesForResource,
} from "@/services/watches";
import { cancelBooking } from "@/services/bookings";
import { changeStatus } from "@/services/resources";
import { listMyNotifications } from "@/services/notifications";
import { WATCH_MAX_ACTIVE } from "@/config/rules";

describe("Resource Watches & Alerts Service (Integration)", () => {
  let fixture: Awaited<ReturnType<typeof createTestData>>;
  let secondStaff: Awaited<ReturnType<typeof createTestData>>["staffUser"];

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestData();

    // Create a second staff user for multi-watcher tests
    secondStaff = await db.user.create({
      data: {
        name: "Second Staff",
        email: "second.staff@lab.example",
        passwordHash: "test-hash",
        role: Role.STAFF,
        siteId: fixture.site.id,
        sectionId: fixture.section.id,
      },
    });
  });

  it("1. creation validation: rejects past time, retired resources, and admin users", async () => {
    // 1a. Past time rejected
    const pastStart = new Date(Date.now() - 3600 * 1000);
    const pastEnd = new Date(Date.now() - 1800 * 1000);

    const pastRes = await createWatch(fixture.staffUser, {
      resourceId: fixture.resource1.id,
      kind: ResourceWatchKind.SLOT_FREE,
      wantedStart: pastStart,
      wantedEnd: pastEnd,
    });
    expect(pastRes.ok).toBe(false);
    expect(pastRes.error).toContain("past");

    // 1b. Admin rejected (only staff and managers can watch)
    const adminUser = await db.user.create({
      data: {
        name: "Admin User",
        email: "admin@lab.example",
        passwordHash: "test-hash",
        role: Role.ADMIN,
      },
    });
    const futureStart = makeTestTime(1, "10:00");
    const futureEnd = makeTestTime(1, "11:00");

    const adminRes = await createWatch(adminUser, {
      resourceId: fixture.resource1.id,
      kind: ResourceWatchKind.SLOT_FREE,
      wantedStart: futureStart,
      wantedEnd: futureEnd,
    });
    expect(adminRes.ok).toBe(false);
    expect(adminRes.error).toContain("Admins do not book or set alerts");

    // 1c. Retired resource rejected
    await db.resource.update({
      where: { id: fixture.resource1.id },
      data: { status: ResourceStatus.RETIRED },
    });

    const retiredRes = await createWatch(fixture.staffUser, {
      resourceId: fixture.resource1.id,
      kind: ResourceWatchKind.BACK_IN_SERVICE,
    });
    expect(retiredRes.ok).toBe(false);
    expect(retiredRes.error).toContain("retired");
  });

  it("2. rejects creating a watch if the slot is already free", async () => {
    const start = makeTestTime(2, "10:00");
    const end = makeTestTime(2, "11:00");

    // Resource is currently completely free at this time
    const freeRes = await createWatch(fixture.staffUser, {
      resourceId: fixture.resource1.id,
      kind: ResourceWatchKind.SLOT_FREE,
      wantedStart: start,
      wantedEnd: end,
    });
    expect(freeRes.ok).toBe(false);
    expect(freeRes.error).toContain("free now");
  });

  it("3. enforces maximum 10 active watches per user", async () => {
    // Fill slot so resource is busy
    const busyStart = makeTestTime(3, "08:00");
    const busyEnd = makeTestTime(3, "20:00");
    await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: secondStaff.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "All day booking",
        startAt: busyStart,
        endAt: busyEnd,
      },
    });

    // Create 10 active watches
    for (let i = 0; i < WATCH_MAX_ACTIVE; i++) {
      const s = makeTestTime(3, `${String(8 + i).padStart(2, "0")}:00`);
      const e = makeTestTime(3, `${String(9 + i).padStart(2, "0")}:00`);
      const res = await createWatch(fixture.staffUser, {
        resourceId: fixture.resource1.id,
        kind: ResourceWatchKind.SLOT_FREE,
        wantedStart: s,
        wantedEnd: e,
      });
      expect(res.ok).toBe(true);
    }

    // 11th watch must be rejected
    const s11 = makeTestTime(3, "18:00");
    const e11 = makeTestTime(3, "19:00");
    const res11 = await createWatch(fixture.staffUser, {
      resourceId: fixture.resource1.id,
      kind: ResourceWatchKind.SLOT_FREE,
      wantedStart: s11,
      wantedEnd: e11,
    });
    expect(res11.ok).toBe(false);
    expect(res11.error).toContain(`at most ${WATCH_MAX_ACTIVE} active alerts`);
  });

  it("4. cancelling a booking fires SLOT_FREE to all watchers and marks watches as SENT", async () => {
    const start = makeTestTime(1, "10:00");
    const end = makeTestTime(1, "12:00");

    // Existing booking on resource1
    const booking = await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: fixture.managerUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "Busy block",
        startAt: start,
        endAt: end,
      },
    });

    // Both staffUser and secondStaff set an alert on this slot
    const watch1 = await createWatch(fixture.staffUser, {
      resourceId: fixture.resource1.id,
      kind: ResourceWatchKind.SLOT_FREE,
      wantedStart: start,
      wantedEnd: end,
    });
    expect(watch1.ok).toBe(true);

    const watch2 = await createWatch(secondStaff, {
      resourceId: fixture.resource1.id,
      kind: ResourceWatchKind.SLOT_FREE,
      wantedStart: start,
      wantedEnd: end,
    });
    expect(watch2.ok).toBe(true);

    // Manager cancels the booking
    const cancelRes = await cancelBooking(fixture.managerUser, booking.id, "Meeting moved");
    expect(cancelRes.ok).toBe(true);
    await checkWatchesForResource(fixture.resource1.id);

    // Both watchers should have received a SLOT_FREE notification
    const notifs1 = await listMyNotifications(fixture.staffUser);
    expect(notifs1.total).toBe(1);
    expect(notifs1.items[0].kind).toBe(NotificationKind.SLOT_FREE);
    expect(notifs1.items[0].link).toContain("/book");

    const notifs2 = await listMyNotifications(secondStaff);
    expect(notifs2.total).toBe(1);
    expect(notifs2.items[0].kind).toBe(NotificationKind.SLOT_FREE);

    // Both watches should now have status SENT
    const watches1 = await listMyWatches(fixture.staffUser);
    expect(watches1[0].status).toBe(ResourceWatchStatus.SENT);

    const watches2 = await listMyWatches(secondStaff);
    expect(watches2[0].status).toBe(ResourceWatchStatus.SENT);
  });

  it("5. watch does NOT fire if slot remains occupied by an overlapping booking", async () => {
    const start1 = makeTestTime(1, "10:00");
    const end1 = makeTestTime(1, "11:00");
    const start2 = makeTestTime(1, "11:00");
    const end2 = makeTestTime(1, "12:00");

    // Booking 1: 10:00 - 11:00
    const booking1 = await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: fixture.managerUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "Booking 1",
        startAt: start1,
        endAt: end1,
      },
    });

    // Maintenance 2: 11:00 - 12:00 (back-to-back)
    await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: fixture.managerUser.id,
        kind: ReservationKind.MAINTENANCE,
        status: ReservationStatus.CONFIRMED,
        purpose: "Overlap maintenance",
        startAt: start2,
        endAt: end2,
      },
    });

    // Watcher wanted 10:00 - 12:00 (2 hours)
    const watch = await createWatch(fixture.staffUser, {
      resourceId: fixture.resource1.id,
      kind: ResourceWatchKind.SLOT_FREE,
      wantedStart: start1,
      wantedEnd: end2,
    });
    expect(watch.ok).toBe(true);

    // Cancel booking 1
    await cancelBooking(fixture.managerUser, booking1.id, "Cancel 1");
    await checkWatchesForResource(fixture.resource1.id);

    // Watcher wanted 10:00 - 12:00, but 11:00 - 12:00 is still blocked by maintenance
    const notifs = await listMyNotifications(fixture.staffUser);
    expect(notifs.total).toBe(0);

    // Watch remains ACTIVE
    const watches = await listMyWatches(fixture.staffUser);
    expect(watches[0].status).toBe(ResourceWatchStatus.ACTIVE);
  });

  it("6. resource status change to ACTIVE fires BACK_IN_SERVICE watch", async () => {
    // Mark resource OUT_OF_SERVICE
    await db.resource.update({
      where: { id: fixture.resource1.id },
      data: { status: ResourceStatus.OUT_OF_SERVICE },
    });

    // Staff sets a BACK_IN_SERVICE watch
    const watch = await createWatch(fixture.staffUser, {
      resourceId: fixture.resource1.id,
      kind: ResourceWatchKind.BACK_IN_SERVICE,
    });
    expect(watch.ok).toBe(true);

    // Manager updates resource status back to ACTIVE
    const updateRes = await changeStatus(
      fixture.managerUser,
      fixture.resource1.id,
      ResourceStatus.ACTIVE,
    );
    expect(updateRes.ok).toBe(true);
    await checkWatchesForResource(fixture.resource1.id);

    // Watcher receives RESOURCE_BACK_IN_SERVICE notification
    const notifs = await listMyNotifications(fixture.staffUser);
    expect(notifs.total).toBe(1);
    expect(notifs.items[0].kind).toBe(NotificationKind.RESOURCE_BACK_IN_SERVICE);
    expect(notifs.items[0].title.toLowerCase()).toContain("back in service");
    expect(notifs.items[0].link).toContain(fixture.resource1.id);

    // Watch is updated to SENT
    const myWatches = await listMyWatches(fixture.staffUser);
    expect(myWatches[0].status).toBe(ResourceWatchStatus.SENT);
  });

  it("7. cancelling a watch: user can cancel own watch, but not another user's watch", async () => {
    // Fill slot so resource is busy
    const start = makeTestTime(1, "14:00");
    const end = makeTestTime(1, "15:00");
    await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: fixture.managerUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "Busy",
        startAt: start,
        endAt: end,
      },
    });

    const watch = await createWatch(fixture.staffUser, {
      resourceId: fixture.resource1.id,
      kind: ResourceWatchKind.SLOT_FREE,
      wantedStart: start,
      wantedEnd: end,
    });
    expect(watch.ok).toBe(true);
    const watchId = watch.data!.id;

    // Second staff attempts to cancel first staff's watch -> rejected
    const unauthorizedCancel = await cancelMyWatch(secondStaff, watchId);
    expect(unauthorizedCancel.ok).toBe(false);

    // Owner cancels their own watch -> succeeds
    const ownerCancel = await cancelMyWatch(fixture.staffUser, watchId);
    expect(ownerCancel.ok).toBe(true);

    const myWatches = await listMyWatches(fixture.staffUser);
    expect(myWatches[0].status).toBe(ResourceWatchStatus.CANCELLED);
  });
});
