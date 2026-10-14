import bcrypt from "bcryptjs";
import { TZDate } from "@date-fns/tz";
import { addDays } from "date-fns";
import { db } from "@/lib/db";
import { Role, ResourceStatus } from "@/generated/prisma/client";

// Hash once at module level so test iterations run fast
const TEST_PASSWORD_HASH = bcrypt.hashSync("test-password-12345", 10);

/**
 * Resets all test database tables.
 * Throws if DATABASE_URL does not contain "_test" to prevent wiping development data.
 */
export async function resetDatabase(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl.includes("_test")) {
    throw new Error(
      `Safety check failed: DATABASE_URL must contain "_test" to run tests. Current URL: ${dbUrl}`,
    );
  }

  await db.$executeRawUnsafe(
    `TRUNCATE TABLE equipment_records, reservations, resources, users, categories, sections, sites CASCADE;`,
  );
}

/**
 * Creates seed fixture data for tests:
 * 1 site, 1 section, 1 category (maxBookingMinutes 240), 2 resources, 1 STAFF user, 1 MANAGER user.
 */
export async function createTestData() {
  const site = await db.site.create({
    data: {
      name: "Test Lab",
      address: "123 Lab Way",
    },
  });

  const section = await db.section.create({
    data: {
      name: "Test Diagnostics",
    },
  });

  const category = await db.category.create({
    data: {
      name: "Test Instruments",
      maxBookingMinutes: 240,
      iconKey: "other",
    },
  });

  const resource1 = await db.resource.create({
    data: {
      name: "Test Resource 1",
      categoryId: category.id,
      siteId: site.id,
      sectionId: section.id,
      status: ResourceStatus.ACTIVE,
    },
  });

  const resource2 = await db.resource.create({
    data: {
      name: "Test Resource 2",
      categoryId: category.id,
      siteId: site.id,
      sectionId: section.id,
      status: ResourceStatus.ACTIVE,
    },
  });

  const staffUser = await db.user.create({
    data: {
      name: "Test Staff",
      email: "test.staff@lab.example",
      passwordHash: TEST_PASSWORD_HASH,
      role: Role.STAFF,
      siteId: site.id,
      sectionId: section.id,
      mustChangePassword: false,
    },
  });

  const managerUser = await db.user.create({
    data: {
      name: "Test Manager",
      email: "test.manager@lab.example",
      passwordHash: TEST_PASSWORD_HASH,
      role: Role.MANAGER,
      siteId: site.id,
      mustChangePassword: false,
    },
  });

  return {
    site,
    section,
    category,
    resource1,
    resource2,
    staffUser,
    managerUser,
  };
}

/**
 * Generates a Date in the given timeZone (default Asia/Colombo) for a specific time and days offset.
 */
export function makeTestTime(daysOffset: number, timeStr: string, timeZone = "Asia/Colombo"): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new TZDate(new Date(), timeZone);
  const targetDay = addDays(now, daysOffset);
  return new TZDate(
    targetDay.getFullYear(),
    targetDay.getMonth(),
    targetDay.getDate(),
    hours,
    minutes,
    0,
    0,
    timeZone,
  );
}
