import { describe, expect, it, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { resetDatabase, createTestData } from "../helpers/db";
import { authenticate, changePassword } from "@/services/auth";

describe("Authentication & Account Lockout Service (Integration)", () => {
  let fixture: Awaited<ReturnType<typeof createTestData>>;

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestData();
  });

  it("1. right password succeeds, resets failed counter, and updates lastLoginAt", async () => {
    // Increment counter once first
    await db.user.update({
      where: { id: fixture.staffUser.id },
      data: { failedLoginCount: 2 },
    });

    const result = await authenticate("test.staff@lab.example", "test-password-12345");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe(fixture.staffUser.id);
      expect(result.user.email).toBe("test.staff@lab.example");
      expect(result.user.role).toBe("STAFF");
    }

    const userInDb = await db.user.findUnique({
      where: { id: fixture.staffUser.id },
    });
    expect(userInDb?.failedLoginCount).toBe(0);
    expect(userInDb?.lockedUntil).toBeNull();
    expect(userInDb?.lastLoginAt).not.toBeNull();
  });

  it("2. wrong password increments failedLoginCount", async () => {
    const result = await authenticate("test.staff@lab.example", "incorrect-secret-guess");
    expect(result.ok).toBe(false);

    const userInDb = await db.user.findUnique({
      where: { id: fixture.staffUser.id },
    });
    expect(userInDb?.failedLoginCount).toBe(1);
    expect(userInDb?.lockedUntil).toBeNull();
  });

  it("3. the 5th failed attempt locks the account for 15 minutes", async () => {
    const now = new Date("2026-10-13T10:00:00Z");

    for (let i = 1; i <= 4; i++) {
      const res = await authenticate("test.staff@lab.example", "wrong-attempt", now);
      expect(res.ok).toBe(false);
      const user = await db.user.findUnique({ where: { id: fixture.staffUser.id } });
      expect(user?.failedLoginCount).toBe(i);
      expect(user?.lockedUntil).toBeNull();
    }

    // 5th attempt locks the account
    const fifth = await authenticate("test.staff@lab.example", "wrong-attempt", now);
    expect(fifth.ok).toBe(false);

    const lockedUser = await db.user.findUnique({ where: { id: fixture.staffUser.id } });
    expect(lockedUser?.failedLoginCount).toBe(0);
    expect(lockedUser?.lockedUntil).not.toBeNull();
    expect(lockedUser?.lockedUntil?.toISOString()).toBe(
      new Date("2026-10-13T10:15:00Z").toISOString(),
    );
  });

  it("4. locked account fails even with the right password while lockedUntil is in the future", async () => {
    const lockTime = new Date(Date.now() + 15 * 60 * 1000);
    await db.user.update({
      where: { id: fixture.staffUser.id },
      data: { lockedUntil: lockTime },
    });

    const result = await authenticate("test.staff@lab.example", "test-password-12345");
    expect(result.ok).toBe(false);
  });

  it("5. works again after lockedUntil has passed", async () => {
    const lockTime = new Date("2026-10-13T10:15:00Z");

    await db.user.update({
      where: { id: fixture.staffUser.id },
      data: { lockedUntil: lockTime },
    });

    // Attempt at 10:10 fails (still locked)
    const midAttempt = await authenticate(
      "test.staff@lab.example",
      "test-password-12345",
      new Date("2026-10-13T10:10:00Z"),
    );
    expect(midAttempt.ok).toBe(false);

    // Attempt at 10:16 succeeds (lock expired)
    const afterAttempt = await authenticate(
      "test.staff@lab.example",
      "test-password-12345",
      new Date("2026-10-13T10:16:00Z"),
    );
    expect(afterAttempt.ok).toBe(true);

    const userInDb = await db.user.findUnique({ where: { id: fixture.staffUser.id } });
    expect(userInDb?.lockedUntil).toBeNull();
    expect(userInDb?.failedLoginCount).toBe(0);
  });

  it("6. 10 wrong attempts sent in parallel leave the account locked and subsequent right password fails", async () => {
    const promises = Array.from({ length: 10 }).map((_, i) =>
      authenticate("test.staff@lab.example", `parallel-wrong-${i}`),
    );
    const results = await Promise.all(promises);
    expect(results.every((r) => r.ok === false)).toBe(true);

    const userInDb = await db.user.findUnique({ where: { id: fixture.staffUser.id } });
    expect(userInDb?.lockedUntil).not.toBeNull();
    expect(userInDb?.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

    // Right password fails while locked
    const rightAttempt = await authenticate("test.staff@lab.example", "test-password-12345");
    expect(rightAttempt.ok).toBe(false);
  });

  it("7. inactive user fails authentication even with correct password", async () => {
    await db.user.update({
      where: { id: fixture.staffUser.id },
      data: { isActive: false },
    });

    const result = await authenticate("test.staff@lab.example", "test-password-12345");
    expect(result.ok).toBe(false);
  });

  it("8. unknown email fails authentication without error", async () => {
    const result = await authenticate("nonexistent@lab.example", "test-password-12345");
    expect(result.ok).toBe(false);
  });

  it("9. changePassword clears mustChangePassword and increments sessionVersion", async () => {
    await db.user.update({
      where: { id: fixture.staffUser.id },
      data: { mustChangePassword: true, sessionVersion: 1 },
    });

    const newSecret = "secure-new-cloud-battery-staple";
    const result = await changePassword(fixture.staffUser.id, "test-password-12345", newSecret);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sessionVersion).toBe(2);
    }

    const updatedUser = await db.user.findUnique({ where: { id: fixture.staffUser.id } });
    expect(updatedUser?.mustChangePassword).toBe(false);
    expect(updatedUser?.sessionVersion).toBe(2);

    // Old password no longer works
    const oldAttempt = await authenticate("test.staff@lab.example", "test-password-12345");
    expect(oldAttempt.ok).toBe(false);

    // New password works
    const newAttempt = await authenticate("test.staff@lab.example", newSecret);
    expect(newAttempt.ok).toBe(true);
  });

  it("10. changePassword refuses short, common, unchanged, and wrong current password", async () => {
    const validNew = "valid-new-pass-string-one";

    // Wrong current password
    const wrongCurrent = await changePassword(fixture.staffUser.id, "wrong-password", validNew);
    expect(wrongCurrent.ok).toBe(false);
    if (!wrongCurrent.ok) {
      expect(wrongCurrent.error).toContain("Current password is incorrect");
    }

    // Short password (< 15)
    const shortNew = await changePassword(fixture.staffUser.id, "test-password-12345", "short123");
    expect(shortNew.ok).toBe(false);
    if (!shortNew.ok) {
      expect(shortNew.error).toContain("Use at least 15 characters");
    }

    // Common password
    const commonNew = await changePassword(
      fixture.staffUser.id,
      "test-password-12345",
      "password12345678",
    );
    expect(commonNew.ok).toBe(false);
    if (!commonNew.ok) {
      expect(commonNew.error).toContain("too common");
    }

    // Unchanged password
    const unchanged = await changePassword(
      fixture.staffUser.id,
      "test-password-12345",
      "test-password-12345",
    );
    expect(unchanged.ok).toBe(false);
    if (!unchanged.ok) {
      expect(unchanged.error).toContain("different from current");
    }
  });
});
