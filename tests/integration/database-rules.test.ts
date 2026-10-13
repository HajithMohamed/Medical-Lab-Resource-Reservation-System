import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { isOverlapError, isCheckError } from "@/lib/db-errors";
import { resetDatabase, createTestData, makeTestTime } from "../helpers/db";
import { Role, ReservationKind, ReservationStatus } from "@/generated/prisma/client";

describe("Database Rules & Constraints", () => {
  let fixture: Awaited<ReturnType<typeof createTestData>>;

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestData();
  });

  it("1. an overlapping CONFIRMED booking is rejected, and isOverlapError(error) is true", async () => {
    const start1 = makeTestTime(1, "10:00");
    const end1 = makeTestTime(1, "12:00");
    const start2 = makeTestTime(1, "11:00");
    const end2 = makeTestTime(1, "13:00");

    // First booking: 10:00 - 12:00
    await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: fixture.staffUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "First booking",
        startAt: start1,
        endAt: end1,
      },
    });

    // Overlapping second booking: 11:00 - 13:00
    let thrownError: unknown;
    try {
      await db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: fixture.staffUser.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Clashing booking",
          startAt: start2,
          endAt: end2,
        },
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();
    expect(isOverlapError(thrownError)).toBe(true);
  });

  it("2. back-to-back bookings (10:00-12:00 and 12:00-14:00) are allowed", async () => {
    const start1 = makeTestTime(1, "10:00");
    const end1 = makeTestTime(1, "12:00");
    const start2 = makeTestTime(1, "12:00");
    const end2 = makeTestTime(1, "14:00");

    const booking1 = await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: fixture.staffUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "Morning slot",
        startAt: start1,
        endAt: end1,
      },
    });

    const booking2 = await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: fixture.staffUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "Afternoon slot",
        startAt: start2,
        endAt: end2,
      },
    });

    expect(booking1.id).toBeDefined();
    expect(booking2.id).toBeDefined();
  });

  it("3. a CANCELLED booking does not block the same time", async () => {
    const start = makeTestTime(1, "10:00");
    const end = makeTestTime(1, "12:00");

    // Cancelled reservation
    await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: fixture.staffUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CANCELLED,
        purpose: "Cancelled booking",
        startAt: start,
        endAt: end,
        cancelReason: "Staff unavailable",
        cancelledAt: start,
        cancelledById: fixture.staffUser.id,
      },
    });

    // Confirmed booking for the exact same time
    const newBooking = await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: fixture.staffUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "Replacement booking",
        startAt: start,
        endAt: end,
      },
    });

    expect(newBooking.id).toBeDefined();
    expect(newBooking.status).toBe(ReservationStatus.CONFIRMED);
  });

  it("4. a MAINTENANCE block blocks a booking, and a booking blocks a block", async () => {
    const startMaint = makeTestTime(2, "10:00");
    const endMaint = makeTestTime(2, "12:00");

    // Create MAINTENANCE block
    await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: fixture.managerUser.id,
        kind: ReservationKind.MAINTENANCE,
        status: ReservationStatus.CONFIRMED,
        purpose: "Calibration",
        startAt: startMaint,
        endAt: endMaint,
      },
    });

    // Try booking that overlaps maintenance
    let bookingError: unknown;
    try {
      await db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: fixture.staffUser.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Overlapping booking",
          startAt: makeTestTime(2, "11:00"),
          endAt: makeTestTime(2, "13:00"),
        },
      });
    } catch (err) {
      bookingError = err;
    }
    expect(isOverlapError(bookingError)).toBe(true);

    // On resource 2: create BOOKING, then try MAINTENANCE that overlaps
    await db.reservation.create({
      data: {
        resourceId: fixture.resource2.id,
        createdById: fixture.staffUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "Active booking",
        startAt: makeTestTime(2, "14:00"),
        endAt: makeTestTime(2, "16:00"),
      },
    });

    let maintError: unknown;
    try {
      await db.reservation.create({
        data: {
          resourceId: fixture.resource2.id,
          createdById: fixture.managerUser.id,
          kind: ReservationKind.MAINTENANCE,
          status: ReservationStatus.CONFIRMED,
          purpose: "Emergency repair",
          startAt: makeTestTime(2, "15:00"),
          endAt: makeTestTime(2, "17:00"),
        },
      });
    } catch (err) {
      maintError = err;
    }
    expect(isOverlapError(maintError)).toBe(true);
  });

  it("5. the same time on two different resources is allowed", async () => {
    const start = makeTestTime(1, "10:00");
    const end = makeTestTime(1, "12:00");

    const bookingRes1 = await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: fixture.staffUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "Resource 1 usage",
        startAt: start,
        endAt: end,
      },
    });

    const bookingRes2 = await db.reservation.create({
      data: {
        resourceId: fixture.resource2.id,
        createdById: fixture.staffUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        purpose: "Resource 2 usage",
        startAt: start,
        endAt: end,
      },
    });

    expect(bookingRes1.id).toBeDefined();
    expect(bookingRes2.id).toBeDefined();
  });

  it("6. two people at the same moment: 5 identical inserts with Promise.allSettled, exactly 1 fulfilled and 4 rejected with isOverlapError", async () => {
    const start = makeTestTime(3, "09:00");
    const end = makeTestTime(3, "11:00");

    const attempts = Array.from({ length: 5 }, (_, i) =>
      db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: fixture.staffUser.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: `Concurrent attempt ${i}`,
          startAt: start,
          endAt: end,
        },
      }),
    );

    const results = await Promise.allSettled(attempts);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(4);

    for (const rej of rejected) {
      expect(isOverlapError(rej.reason)).toBe(true);
    }
  });

  it("7. CHECK rules: end before start fails, CANCELLED without reason fails, STAFF without site fails, uppercase email fails", async () => {
    const start = makeTestTime(1, "12:00");
    const earlierEnd = makeTestTime(1, "10:00");

    // 7a. reservations_time_order (end_at > start_at)
    let timeOrderError: unknown;
    try {
      await db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: fixture.staffUser.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Invalid time order",
          startAt: start,
          endAt: earlierEnd,
        },
      });
    } catch (err) {
      timeOrderError = err;
    }
    expect(isCheckError(timeOrderError, "reservations_time_order")).toBe(true);

    // 7b. reservations_cancel_fields (CANCELLED requires cancelReason, cancelledAt, cancelledById)
    let cancelFieldsError: unknown;
    try {
      await db.reservation.create({
        data: {
          resourceId: fixture.resource1.id,
          createdById: fixture.staffUser.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CANCELLED,
          purpose: "Cancelled without details",
          startAt: makeTestTime(1, "14:00"),
          endAt: makeTestTime(1, "15:00"),
          // Missing cancel reason, cancelledAt, cancelledById
        },
      });
    } catch (err) {
      cancelFieldsError = err;
    }
    expect(isCheckError(cancelFieldsError, "reservations_cancel_fields")).toBe(true);

    // 7c. users_site_required_unless_admin (STAFF without a site must fail)
    let siteRequiredError: unknown;
    try {
      await db.user.create({
        data: {
          name: "Siteless Staff",
          email: "siteless.staff@lab.example",
          passwordHash: "test-hash-at-least-some-chars",
          role: Role.STAFF,
          siteId: null,
          mustChangePassword: false,
        },
      });
    } catch (err) {
      siteRequiredError = err;
    }
    expect(isCheckError(siteRequiredError, "users_site_required_unless_admin")).toBe(true);

    // 7d. users_email_lowercase (email must be strictly lowercase)
    let uppercaseEmailError: unknown;
    try {
      await db.user.create({
        data: {
          name: "Uppercase User",
          email: "Upper.Case@lab.example",
          passwordHash: "test-hash-at-least-some-chars",
          role: Role.ADMIN,
          mustChangePassword: false,
        },
      });
    } catch (err) {
      uppercaseEmailError = err;
    }
    expect(isCheckError(uppercaseEmailError, "users_email_lowercase")).toBe(true);
  });

  it("8. database rules exist: query pg_constraint and verify reservations_no_overlap and all CHECK constraints", async () => {
    interface ConstraintRow {
      conname: string;
      contype: string;
    }

    const rows = await db.$queryRaw<ConstraintRow[]>`
      SELECT conname, contype::text AS contype
      FROM pg_constraint
      WHERE conname IN (
        'reservations_no_overlap',
        'reservations_time_order',
        'reservations_cancel_fields',
        'reservations_attendee_count_positive',
        'resources_capacity_positive',
        'categories_max_booking_minutes_positive',
        'users_email_lowercase',
        'users_site_required_unless_admin',
        'users_failed_login_count_not_negative'
      );
    `;

    const constraintsByName = new Map<string, string>();
    for (const row of rows) {
      constraintsByName.set(row.conname, row.contype);
    }

    // Exclusion constraint (contype 'x')
    expect(constraintsByName.get("reservations_no_overlap")).toBe("x");

    // CHECK constraints (contype 'c')
    const expectedChecks = [
      "reservations_time_order",
      "reservations_cancel_fields",
      "reservations_attendee_count_positive",
      "resources_capacity_positive",
      "categories_max_booking_minutes_positive",
      "users_email_lowercase",
      "users_site_required_unless_admin",
      "users_failed_login_count_not_negative",
    ];

    for (const checkName of expectedChecks) {
      expect(constraintsByName.get(checkName), `Missing CHECK constraint ${checkName}`).toBe("c");
    }
  });
});
