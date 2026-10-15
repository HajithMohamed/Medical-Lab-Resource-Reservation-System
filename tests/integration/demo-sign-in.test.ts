import { describe, expect, it, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authenticate } from "@/services/auth";
import { Role } from "@/generated/prisma/client";
import { BCRYPT_COST } from "@/config/rules";
import { resetDatabase } from "../helpers/db";

const DEMO_PASSWORD = "green-hill-cloud-2026";

describe("Demo accounts sign in (service level)", () => {
  let siteId: string;

  beforeEach(async () => {
    await resetDatabase();
    const site = await db.site.create({ data: { name: "Main Laboratory, Colombo" } });
    siteId = site.id;
    const hash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);

    await db.user.createMany({
      data: [
        {
          name: "Lab Administrator",
          email: "admin@lab.example",
          passwordHash: hash,
          role: Role.ADMIN,
          mustChangePassword: false,
        },
        {
          name: "Nadeesha Perera",
          email: "nadeesha.perera@lab.example",
          passwordHash: hash,
          role: Role.MANAGER,
          siteId,
          mustChangePassword: false,
        },
        {
          name: "Kasun Silva",
          email: "kasun.silva@lab.example",
          passwordHash: hash,
          role: Role.STAFF,
          siteId,
          mustChangePassword: false,
        },
      ],
    });
  });

  it.each([
    ["admin@lab.example", Role.ADMIN],
    ["nadeesha.perera@lab.example", Role.MANAGER],
    ["kasun.silva@lab.example", Role.STAFF],
  ])("%s signs in with the demo password", async (email, role) => {
    const result = await authenticate(email, DEMO_PASSWORD);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.user.role).toBe(role);
    expect(result.user.mustChangePassword).toBe(false);
  });

  it("matches the email regardless of case and spaces", async () => {
    const result = await authenticate("  Kasun.Silva@Lab.Example ", DEMO_PASSWORD);
    expect(result.ok).toBe(true);
  });

  it("a locked account fails the same generic way as a wrong password", async () => {
    await db.user.update({
      where: { email: "kasun.silva@lab.example" },
      data: { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) },
    });

    const locked = await authenticate("kasun.silva@lab.example", DEMO_PASSWORD);
    const wrong = await authenticate("nadeesha.perera@lab.example", "not-the-password");

    // Same shape: no reason is revealed, so the login page shows one generic message.
    expect(locked).toEqual({ ok: false });
    expect(wrong).toEqual({ ok: false });
  });
});
