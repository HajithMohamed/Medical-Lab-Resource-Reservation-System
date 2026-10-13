import { describe, expect, it } from "vitest";
import { checkNewPassword, generateTemporaryPassword } from "@/lib/password";
import { TEMP_PASSWORD_ALPHABET } from "@/config/rules";

describe("Password validation (checkNewPassword)", () => {
  const testEmail = "dilani.fernando@lab.example";

  it("refuses 14 characters and accepts 15 characters", () => {
    // 14 characters: refused
    const fourteen = "abcde fghij 12"; // length 14
    expect(fourteen.length).toBe(14);
    expect(checkNewPassword(fourteen, testEmail)).toBe(
      "Use at least 15 characters. Tip: join three or four random words.",
    );

    // 15 characters: accepted
    const fifteen = "correct horse a";
    expect(fifteen.length).toBe(15);
    expect(checkNewPassword(fifteen, testEmail)).toBeNull();
  });

  it("refuses 65 characters and accepts 64 ASCII characters", () => {
    const sixtyFour = "a".repeat(32) + "b".repeat(32);
    expect(sixtyFour.length).toBe(64);
    expect(checkNewPassword(sixtyFour, testEmail)).toBeNull();

    const sixtyFive = "a".repeat(32) + "b".repeat(33);
    expect(sixtyFive.length).toBe(65);
    expect(checkNewPassword(sixtyFive, testEmail)).toContain(
      "Password must be at most 64 characters",
    );
  });

  it("refuses 64 characters of 3-byte letters by the bcrypt 72-byte rule", () => {
    // Japanese/Tamil/Sinhala characters take 3 UTF-8 bytes each
    // 30 characters * 3 bytes = 90 bytes > 72 bytes
    const multiByte = "සංවර්ධනය".repeat(8); // 8 * 8 = 64 chars, 64 * 3 = 192 bytes
    expect(multiByte.length).toBeGreaterThanOrEqual(15);
    expect(new TextEncoder().encode(multiByte).length).toBeGreaterThan(72);
    expect(checkNewPassword(multiByte, testEmail)).toContain("at most 72 bytes");
  });

  it("refuses common passwords in any letter case", () => {
    expect(checkNewPassword("password12345678", testEmail)).toContain("too common");
    expect(checkNewPassword("PASSWORD12345678", testEmail)).toContain("too common");
    expect(checkNewPassword("QWERTYUIOPASDFGH", testEmail)).toContain("too common");
    expect(checkNewPassword("Laboratory12345", testEmail)).toContain("too common");
  });

  it("refuses passwords containing the email username when 3+ chars", () => {
    // email is dilani.fernando@lab.example -> username is "dilani.fernando" (>= 3 chars)
    expect(checkNewPassword("my-dilani.fernando-pass", testEmail)).toContain(
      "must not contain your email username",
    );
    expect(checkNewPassword("DILANI.FERNANDO-1234", testEmail)).toContain(
      "must not contain your email username",
    );

    // email with short username (< 3 chars): should not trigger rule
    const shortEmail = "ab@lab.example";
    expect(checkNewPassword("valid-pass-with-ab-included", shortEmail)).toBeNull();
  });

  it("refuses a single repeated character", () => {
    const repeated = "1".repeat(16);
    expect(checkNewPassword(repeated, testEmail)).toContain("single repeated character");

    const repeatedLetters = "x".repeat(20);
    expect(checkNewPassword(repeatedLetters, testEmail)).toContain("single repeated character");
  });

  it("allows valid passwords with spaces", () => {
    const spaced = "battery staple horse cloud";
    expect(spaced.length).toBeGreaterThanOrEqual(15);
    expect(checkNewPassword(spaced, testEmail)).toBeNull();
  });
});

describe("Temporary password generator (generateTemporaryPassword)", () => {
  it("matches the expected group format, length, alphabet, and passes checkNewPassword", () => {
    const tempPass = generateTemporaryPassword();

    // 4 groups of 4 characters joined by hyphens: xxxx-xxxx-xxxx-xxxx = 19 characters
    expect(tempPass).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    expect(tempPass.length).toBeGreaterThanOrEqual(15);

    // Characters must only come from TEMP_PASSWORD_ALPHABET
    const charsWithoutHyphen = tempPass.replace(/-/g, "");
    for (const char of charsWithoutHyphen) {
      expect(TEMP_PASSWORD_ALPHABET).toContain(char);
    }

    // Must pass checkNewPassword
    expect(checkNewPassword(tempPass, "someone@lab.example")).toBeNull();
  });
});
