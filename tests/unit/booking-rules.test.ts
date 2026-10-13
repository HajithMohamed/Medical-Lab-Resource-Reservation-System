import { describe, it, expect } from "vitest";
import { checkCategoryLimit } from "@/lib/booking-rules";

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
