import { describe, it, expect } from "vitest";
import { formatMinutes } from "@/lib/format";

describe("formatMinutes", () => {
  it("formats minutes under an hour", () => {
    expect(formatMinutes(15)).toBe("15 min");
    expect(formatMinutes(45)).toBe("45 min");
  });

  it("formats exact whole hours", () => {
    expect(formatMinutes(60)).toBe("1 h");
    expect(formatMinutes(120)).toBe("2 h");
    expect(formatMinutes(240)).toBe("4 h");
    expect(formatMinutes(720)).toBe("12 h");
  });

  it("formats mixed hours and minutes", () => {
    expect(formatMinutes(75)).toBe("1 h 15 min");
    expect(formatMinutes(90)).toBe("1 h 30 min");
    expect(formatMinutes(150)).toBe("2 h 30 min");
  });

  it("handles edge cases gracefully", () => {
    expect(formatMinutes(0)).toBe("0 min");
    expect(formatMinutes(-10)).toBe("0 min");
  });
});
