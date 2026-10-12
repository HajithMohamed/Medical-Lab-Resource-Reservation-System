import { describe, expect, it } from "vitest";
import {
  BUSY_UTILISATION_PERCENT,
  IDLE_UTILISATION_PERCENT,
  MIN_BOOKING_MINUTES,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  SLOT_MINUTES,
  STANDARD_DAY_END_HOUR,
  STANDARD_DAY_START_HOUR,
} from "@/config/rules";

describe("Business rules configuration", () => {
  it("SLOT_MINUTES divides 60 evenly", () => {
    expect(60 % SLOT_MINUTES).toBe(0);
  });

  it("MIN_BOOKING_MINUTES is a multiple of SLOT_MINUTES", () => {
    expect(MIN_BOOKING_MINUTES % SLOT_MINUTES).toBe(0);
  });

  it("PASSWORD_MIN_LENGTH is at least 15", () => {
    expect(PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(15);
  });

  it("PASSWORD_MAX_LENGTH is at least 64", () => {
    expect(PASSWORD_MAX_LENGTH).toBeGreaterThanOrEqual(64);
  });

  it("STANDARD_DAY_START_HOUR is before STANDARD_DAY_END_HOUR", () => {
    expect(STANDARD_DAY_START_HOUR).toBeLessThan(STANDARD_DAY_END_HOUR);
  });

  it("IDLE_UTILISATION_PERCENT is less than BUSY_UTILISATION_PERCENT", () => {
    expect(IDLE_UTILISATION_PERCENT).toBeLessThan(BUSY_UTILISATION_PERCENT);
  });
});
