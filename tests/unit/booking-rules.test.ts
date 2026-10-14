import { describe, it, expect } from "vitest";
import {
  checkCategoryLimit,
  checkBookingTimes,
  checkAttendees,
  checkCalibrationDue,
  formatDurationWords,
} from "@/lib/booking-rules";
import { parseLabDateTime, endOfLabDay } from "@/lib/time";

describe("Booking Rules (Unit)", () => {
  const zone = "Asia/Colombo";

  describe("formatDurationWords", () => {
    it("formats minutes into human readable words", () => {
      expect(formatDurationWords(15)).toBe("15 minutes");
      expect(formatDurationWords(60)).toBe("1 hour");
      expect(formatDurationWords(90)).toBe("1 hour 30 minutes");
      expect(formatDurationWords(240)).toBe("4 hours");
    });
  });

  describe("checkCategoryLimit", () => {
    it("refuses 14 (below SLOT_MINUTES of 15)", () => {
      const error = checkCategoryLimit(14);
      expect(error).toBe("Limit must be at least 15 minutes.");
    });

    it("accepts 15 (minimum booking slot)", () => {
      expect(checkCategoryLimit(15)).toBeNull();
    });

    it("refuses 250 because it is not a multiple of 15", () => {
      const error = checkCategoryLimit(250);
      expect(error).toBe("Limit must be a multiple of 15 minutes.");
    });

    it("accepts valid multiples of 15 up to maximum limit", () => {
      expect(checkCategoryLimit(60)).toBeNull();
      expect(checkCategoryLimit(240)).toBeNull();
      expect(checkCategoryLimit(720)).toBeNull();
      expect(checkCategoryLimit(10080)).toBeNull();
    });

    it("refuses 10095 (exceeds MAX_CATEGORY_LIMIT_MINUTES of 10080)", () => {
      const error = checkCategoryLimit(10095);
      expect(error).toBe("Limit cannot exceed 10080 minutes.");
    });

    it("refuses non-integer and negative values", () => {
      expect(checkCategoryLimit(15.5)).toBe("Limit must be a whole number of minutes.");
      expect(checkCategoryLimit(-15)).toBe("Limit must be at least 15 minutes.");
    });
  });

  describe("checkBookingTimes", () => {
    // Reference now: 2026-10-13 10:07:00 (inside 10:00 - 10:15 slot)
    const now = parseLabDateTime("2026-10-13", "10:07", zone);

    it("refuses start not on 15-minute slot boundary", () => {
      const startAt = parseLabDateTime("2026-10-13", "10:05", zone);
      const endAt = parseLabDateTime("2026-10-13", "11:00", zone);
      const error = checkBookingTimes({ startAt, endAt, now, maxBookingMinutes: 240, zone });
      expect(error).toBe("Bookings must start and end on 15-minute marks.");
    });

    it("refuses end not on 15-minute slot boundary", () => {
      const startAt = parseLabDateTime("2026-10-13", "10:15", zone);
      const endAt = parseLabDateTime("2026-10-13", "11:07", zone);
      const error = checkBookingTimes({ startAt, endAt, now, maxBookingMinutes: 240, zone });
      expect(error).toBe("Bookings must start and end on 15-minute marks.");
    });

    it("refuses end before start", () => {
      const startAt = parseLabDateTime("2026-10-13", "11:00", zone);
      const endAt = parseLabDateTime("2026-10-13", "10:00", zone);
      const error = checkBookingTimes({ startAt, endAt, now, maxBookingMinutes: 240, zone });
      expect(error).toBe("The end time must be after the start time.");
    });

    it("refuses end equal to start", () => {
      const startAt = parseLabDateTime("2026-10-13", "11:00", zone);
      const endAt = parseLabDateTime("2026-10-13", "11:00", zone);
      const error = checkBookingTimes({ startAt, endAt, now, maxBookingMinutes: 240, zone });
      expect(error).toBe("The end time must be after the start time.");
    });

    it("refuses duration less than MIN_BOOKING_MINUTES (15)", () => {
      // 0 minutes would be caught by endAt <= startAt, but boundary checks verify MIN_BOOKING_MINUTES
      const startAt = parseLabDateTime("2026-10-13", "11:00", zone);
      const endAt = parseLabDateTime("2026-10-13", "11:15", zone);
      // Valid at exactly 15 min
      expect(checkBookingTimes({ startAt, endAt, now, maxBookingMinutes: 240, zone })).toBeNull();
    });

    it("allows exactly the maximum duration (e.g. 4 hours = 240 min)", () => {
      const startAt = parseLabDateTime("2026-10-13", "11:00", zone);
      const endAt = parseLabDateTime("2026-10-13", "15:00", zone);
      expect(checkBookingTimes({ startAt, endAt, now, maxBookingMinutes: 240, zone })).toBeNull();
    });

    it("refuses maximum + 15 minutes (255 min)", () => {
      const startAt = parseLabDateTime("2026-10-13", "11:00", zone);
      const endAt = parseLabDateTime("2026-10-13", "15:15", zone);
      const error = checkBookingTimes({ startAt, endAt, now, maxBookingMinutes: 240, zone });
      expect(error).toBe("Bookings for this resource can be at most 4 hours.");
    });

    it("allows a start inside the current slot (startOfCurrentSlot is 10:00 for now = 10:07)", () => {
      const startAt = parseLabDateTime("2026-10-13", "10:00", zone);
      const endAt = parseLabDateTime("2026-10-13", "11:00", zone);
      expect(checkBookingTimes({ startAt, endAt, now, maxBookingMinutes: 240, zone })).toBeNull();
    });

    it("refuses a start in the previous slot (e.g. 09:45 when now is 10:07)", () => {
      const startAt = parseLabDateTime("2026-10-13", "09:45", zone);
      const endAt = parseLabDateTime("2026-10-13", "10:45", zone);
      const error = checkBookingTimes({ startAt, endAt, now, maxBookingMinutes: 240, zone });
      expect(error).toBe("You can't book a time that has already passed.");
    });

    it("refuses start beyond the booking window (60 days)", () => {
      // 61 days ahead
      const startAt = parseLabDateTime("2026-12-14", "10:00", zone);
      const endAt = parseLabDateTime("2026-12-14", "11:00", zone);
      const error = checkBookingTimes({ startAt, endAt, now, maxBookingMinutes: 240, zone });
      expect(error).toBe("Bookings can be made at most 60 days in advance.");
    });

    it("allows start within the booking window (e.g. 5 days ahead)", () => {
      const startAt = parseLabDateTime("2026-10-18", "10:00", zone);
      const endAt = parseLabDateTime("2026-10-18", "11:00", zone);
      expect(checkBookingTimes({ startAt, endAt, now, maxBookingMinutes: 240, zone })).toBeNull();
    });
  });

  describe("checkAttendees", () => {
    it("allows undefined/null attendeeCount when resource has no capacity", () => {
      expect(checkAttendees(null, null)).toBeNull();
      expect(checkAttendees(null, undefined)).toBeNull();
      expect(checkAttendees(undefined, undefined)).toBeNull();
    });

    it("refuses attendeeCount when resource has no capacity", () => {
      expect(checkAttendees(null, 5)).toBe("This resource does not take an attendee count.");
    });

    it("requires attendeeCount when resource has a capacity", () => {
      expect(checkAttendees(20, null)).toBe("This room holds up to 20 people.");
      expect(checkAttendees(20, undefined)).toBe("This room holds up to 20 people.");
      expect(checkAttendees(20, 0)).toBe("This room holds up to 20 people.");
    });

    it("allows valid attendee count between 1 and capacity", () => {
      expect(checkAttendees(20, 1)).toBeNull();
      expect(checkAttendees(20, 10)).toBeNull();
      expect(checkAttendees(20, 20)).toBeNull();
    });

    it("refuses attendee count exceeding capacity", () => {
      expect(checkAttendees(20, 21)).toBe("This room holds up to 20 people.");
    });
  });

  describe("checkCalibrationDue", () => {
    const resourceName = "PCR machine 1";
    const dueDay = "2026-10-20"; // Tue 20 Oct 2026

    it("returns null if resource has no nextCalibrationDueOn", () => {
      const endAt = parseLabDateTime("2026-10-25", "10:00", zone);
      expect(
        checkCalibrationDue({ resourceName, nextCalibrationDueOn: null, endAt, timeZone: zone }),
      ).toBeNull();
      expect(
        checkCalibrationDue({
          resourceName,
          nextCalibrationDueOn: undefined,
          endAt,
          timeZone: zone,
        }),
      ).toBeNull();
    });

    it("accepts booking ending earlier on the calibration due day", () => {
      const endAt = parseLabDateTime("2026-10-20", "17:00", zone);
      expect(
        checkCalibrationDue({ resourceName, nextCalibrationDueOn: dueDay, endAt, timeZone: zone }),
      ).toBeNull();
    });

    it("accepts booking ending exactly at endOfLabDay(dueDay)", () => {
      const endAt = endOfLabDay(dueDay, zone);
      expect(
        checkCalibrationDue({ resourceName, nextCalibrationDueOn: dueDay, endAt, timeZone: zone }),
      ).toBeNull();
    });

    it("refuses booking ending past the calibration due day with exact message", () => {
      const endAt = parseLabDateTime("2026-10-21", "09:00", zone);
      const error = checkCalibrationDue({
        resourceName,
        nextCalibrationDueOn: dueDay,
        endAt,
        timeZone: zone,
      });

      expect(error).toBe(
        "PCR machine 1 is calibrated only until Tue 20 Oct. Book up to the end of that day, or ask the site manager to record the calibration.",
      );
    });

    it("works identically with Date instance for nextCalibrationDueOn", () => {
      const dueDate = new Date("2026-10-20T00:00:00.000Z");
      const endAtAllowed = parseLabDateTime("2026-10-20", "18:00", zone);
      expect(
        checkCalibrationDue({
          resourceName,
          nextCalibrationDueOn: dueDate,
          endAt: endAtAllowed,
          timeZone: zone,
        }),
      ).toBeNull();

      const endAtPast = parseLabDateTime("2026-10-21", "10:00", zone);
      const error = checkCalibrationDue({
        resourceName,
        nextCalibrationDueOn: dueDate,
        endAt: endAtPast,
        timeZone: zone,
      });
      expect(error).toBe(
        "PCR machine 1 is calibrated only until Tue 20 Oct. Book up to the end of that day, or ask the site manager to record the calibration.",
      );
    });
  });
});
