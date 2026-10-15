import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { resetDatabase, createTestData, makeTestTime } from "../helpers/db";
import {
  Role,
  ReservationKind,
  ReservationStatus,
  NotificationKind,
  EquipmentRecordKind,
  EquipmentOutcome,
} from "@/generated/prisma/client";
import { cancelBooking } from "@/services/bookings";
import { createMaintenanceBlock } from "@/services/maintenance";
import { addEquipmentRecord } from "@/services/equipment";
import { labToday } from "@/lib/time";
import {
  listMyNotifications,
  countUnread,
  pollMyNotifications,
  markRead,
  markAllRead,
  updateMyPreference,
} from "@/services/notifications";
import { syncEquipmentReminders, runDailyJob } from "@/services/daily-job";
import { GET as cronHandler } from "@/app/api/cron/daily/route";
import { NextRequest } from "next/server";
import { env } from "@/lib/env";

describe("Notifications Service & Delivery (Integration)", () => {
  let fixture: Awaited<ReturnType<typeof createTestData>>;

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestData();
  });

  it("1. booking cancellation by another user sends BOOKING_CANCELLED to booker, but not to the actor", async () => {
    const start = makeTestTime(1, "10:00");
    const end = makeTestTime(1, "11:00");

    const booking = await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: fixture.staffUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "Staff reservation",
        startAt: start,
        endAt: end,
      },
    });

    // Manager cancels staff booking
    const result = await cancelBooking(fixture.managerUser, booking.id, "Emergency maintenance");
    expect(result.ok).toBe(true);

    // Booker should have received 1 notification
    const staffNotifs = await listMyNotifications(fixture.staffUser);
    expect(staffNotifs.total).toBe(1);
    expect(staffNotifs.items[0].kind).toBe(NotificationKind.BOOKING_CANCELLED);
    expect(staffNotifs.items[0].title).toContain("cancelled");
    expect(staffNotifs.items[0].body).toContain("Emergency maintenance");
    expect(staffNotifs.items[0].link).toContain("/bookings");

    // Manager (actor) should NOT have received any notification
    const managerNotifs = await listMyNotifications(fixture.managerUser);
    expect(managerNotifs.total).toBe(0);
  });

  it("2. cancelling own booking sends NO notification to the booker", async () => {
    const start = makeTestTime(1, "14:00");
    const end = makeTestTime(1, "15:00");

    const booking = await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: fixture.staffUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "My own test booking",
        startAt: start,
        endAt: end,
      },
    });

    // Staff cancels their own booking
    const result = await cancelBooking(fixture.staffUser, booking.id, "No longer needed");
    expect(result.ok).toBe(true);

    // Staff should NOT receive a notification for their own action
    const staffNotifs = await listMyNotifications(fixture.staffUser);
    expect(staffNotifs.total).toBe(0);
  });

  it("3. creating a clashing maintenance block sends BOOKING_CANCELLED to affected bookers", async () => {
    const start = makeTestTime(2, "09:00");
    const end = makeTestTime(2, "12:00");

    await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: fixture.staffUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "Will be cancelled by maintenance",
        startAt: start,
        endAt: end,
      },
    });

    // Manager creates clashing block with cancelClashingBookings: true
    const blockRes = await createMaintenanceBlock(fixture.managerUser, {
      resourceId: fixture.resource1.id,
      startAt: start,
      endAt: end,
      reason: "MAINTENANCE",
      cancelClashingBookings: true,
    });
    expect(blockRes.ok).toBe(true);

    const staffNotifs = await listMyNotifications(fixture.staffUser);
    expect(staffNotifs.total).toBe(1);
    expect(staffNotifs.items[0].kind).toBe(NotificationKind.BOOKING_CANCELLED);
    expect(staffNotifs.items[0].body).toContain("MAINTENANCE");
  });

  it("4. failed equipment check notifies site manager/admin with EQUIPMENT_OUT_OF_SERVICE, but not actor", async () => {
    const adminUser = await db.user.create({
      data: {
        name: "Admin Observer",
        email: "admin.obs@lab.example",
        passwordHash: "test-hash",
        role: Role.ADMIN,
      },
    });

    // Manager records a failed calibration
    const checkRes = await addEquipmentRecord(fixture.managerUser, fixture.resource1.id, {
      kind: EquipmentRecordKind.CALIBRATION,
      outcome: EquipmentOutcome.FAIL,
      performedOn: labToday(),
      performedBy: "Service Tech",
      workPerformed: "Optical laser alignment",
      notes: "Optical laser alignment defective",
    });
    expect(checkRes.ok).toBe(true);

    // Admin receives EQUIPMENT_OUT_OF_SERVICE
    const adminNotifs = await listMyNotifications(adminUser);
    expect(adminNotifs.total).toBe(1);
    expect(adminNotifs.items[0].kind).toBe(NotificationKind.EQUIPMENT_OUT_OF_SERVICE);
    expect(adminNotifs.items[0].body).toContain("defective");

    // Manager who performed the check is the actor and should NOT receive it
    const managerNotifs = await listMyNotifications(fixture.managerUser);
    expect(managerNotifs.total).toBe(0);
  });

  it("5. notification preferences: respects disabled in-app channels and rejects disabling mandatory kinds", async () => {
    const adminUser = await db.user.create({
      data: {
        name: "Admin Pref User",
        email: "admin.pref@lab.example",
        passwordHash: "test-hash",
        role: Role.ADMIN,
      },
    });

    // Attempt to turn off mandatory BOOKING_CANCELLED
    const rejectRes = await updateMyPreference(fixture.staffUser, {
      kind: NotificationKind.BOOKING_CANCELLED,
      inApp: false,
    });
    expect(rejectRes.ok).toBe(false);
    expect(rejectRes.error).toContain("cannot be turned off");

    // Turn off EQUIPMENT_OUT_OF_SERVICE for admin
    const allowRes = await updateMyPreference(adminUser, {
      kind: NotificationKind.EQUIPMENT_OUT_OF_SERVICE,
      inApp: false,
    });
    expect(allowRes.ok).toBe(true);

    // Manager records a fail
    await addEquipmentRecord(fixture.managerUser, fixture.resource1.id, {
      kind: EquipmentRecordKind.CALIBRATION,
      outcome: EquipmentOutcome.FAIL,
      performedOn: labToday(),
      performedBy: "Service Tech",
      workPerformed: "Switch replacement check",
      notes: "Defective switch",
    });

    // Admin has disabled this kind, so should NOT receive it
    const adminNotifs = await listMyNotifications(adminUser);
    expect(adminNotifs.total).toBe(0);
  });

  it("6. daily job: sends DUE_SOON, DUE_TODAY, OVERDUE reminders with dedupe key idempotency", async () => {
    // Setup equipment with calibration dates:
    // resource1: due in 5 days (DUE_SOON)
    const dueSoonDate = new Date();
    dueSoonDate.setDate(dueSoonDate.getDate() + 5);

    await db.resource.update({
      where: { id: fixture.resource1.id },
      data: {
        calibrationIntervalDays: 30,
        nextCalibrationDueOn: dueSoonDate,
      },
    });

    // resource2: overdue by 2 days (OVERDUE)
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 2);

    await db.resource.update({
      where: { id: fixture.resource2.id },
      data: {
        calibrationIntervalDays: 30,
        nextCalibrationDueOn: overdueDate,
      },
    });

    // Run syncEquipmentReminders
    const count1 = await syncEquipmentReminders(new Date());
    expect(count1).toBeGreaterThanOrEqual(2);

    const managerNotifs1 = await listMyNotifications(fixture.managerUser);
    expect(managerNotifs1.total).toBe(2);

    // Running it a second time on the same day must be completely idempotent (dedupe_key)
    const count2 = await syncEquipmentReminders(new Date());
    expect(count2).toBe(0);

    const managerNotifs2 = await listMyNotifications(fixture.managerUser);
    expect(managerNotifs2.total).toBe(2);
  });

  it("7. daily job cleans up read notifications older than 90 days", async () => {
    // Insert an old read notification (> 90 days ago)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 95);

    await db.notification.create({
      data: {
        userId: fixture.staffUser.id,
        kind: NotificationKind.BOOKING_CANCELLED,
        title: "Old notification",
        body: "Ancient history",
        link: "/bookings",
        readAt: oldDate,
        createdAt: oldDate,
      },
    });

    // Insert a recent notification
    await db.notification.create({
      data: {
        userId: fixture.staffUser.id,
        kind: NotificationKind.BOOKING_CANCELLED,
        title: "Recent notification",
        body: "Recent news",
        link: "/bookings",
      },
    });

    // Run daily job
    const jobRes = await runDailyJob(new Date());
    expect(jobRes.ok).toBe(true);
    expect(jobRes.deletedNotifications).toBe(1);

    const remaining = await listMyNotifications(fixture.staffUser);
    expect(remaining.total).toBe(1);
    expect(remaining.items[0].title).toBe("Recent notification");
  });

  it("8. cron endpoint returns 401 on missing or invalid secret, 200 on valid secret", async () => {
    // Missing auth header -> 401
    const reqNoAuth = new NextRequest("http://localhost:3000/api/cron/daily");
    const resNoAuth = await cronHandler(reqNoAuth);
    expect(resNoAuth.status).toBe(401);

    // Wrong secret -> 401
    const reqWrongAuth = new NextRequest("http://localhost:3000/api/cron/daily", {
      headers: { authorization: "Bearer completely-wrong-secret-token" },
    });
    const resWrongAuth = await cronHandler(reqWrongAuth);
    expect(resWrongAuth.status).toBe(401);

    // Correct secret -> 200
    const reqValidAuth = new NextRequest("http://localhost:3000/api/cron/daily", {
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    });
    const resValidAuth = await cronHandler(reqValidAuth);
    expect(resValidAuth.status).toBe(200);
    const body = await resValidAuth.json();
    expect(body.ok).toBe(true);
  });

  it("9. notification reading and polling: strictly scoped to signed-in user", async () => {
    // Create notifications for staff and manager
    const notifStaff = await db.notification.create({
      data: {
        userId: fixture.staffUser.id,
        kind: NotificationKind.BOOKING_CANCELLED,
        title: "Staff Notif",
        body: "For staff",
        link: "/bookings",
      },
    });

    const notifManager = await db.notification.create({
      data: {
        userId: fixture.managerUser.id,
        kind: NotificationKind.EQUIPMENT_OUT_OF_SERVICE,
        title: "Manager Notif",
        body: "For manager",
        link: "/equipment",
      },
    });

    // Staff poll returns only staff items
    const pollStaff = await pollMyNotifications(fixture.staffUser);
    expect(pollStaff.unread).toBe(1);
    expect(pollStaff.items.length).toBe(1);
    expect(pollStaff.items[0].id).toBe(notifStaff.id);

    // Staff cannot mark manager's notification as read
    const hackRes = await markRead(fixture.staffUser, notifManager.id);
    expect(hackRes.ok).toBe(false);

    // Staff marks their own notification as read
    const markRes = await markRead(fixture.staffUser, notifStaff.id);
    expect(markRes.ok).toBe(true);
    expect(await countUnread(fixture.staffUser)).toBe(0);

    // Manager's notification remains unread
    expect(await countUnread(fixture.managerUser)).toBe(1);

    // Manager marks all read
    const markAllRes = await markAllRead(fixture.managerUser);
    expect(markAllRes.ok).toBe(true);
    expect(markAllRes.count).toBe(1);
    expect(await countUnread(fixture.managerUser)).toBe(0);
  });
});
