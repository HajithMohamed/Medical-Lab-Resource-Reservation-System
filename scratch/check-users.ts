import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true);

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      failedLoginCount: true,
      lockedUntil: true,
      passwordHash: true,
    },
    orderBy: { email: "asc" },
  });
  console.log("Total users found:", users.length);
  for (const u of users) {
    const matchDemo = await bcrypt.compare("green-hill-cloud-2026", u.passwordHash);
    const matchAdmin = await bcrypt.compare("blue-river-lamp-2026", u.passwordHash);
    console.log(
      JSON.stringify({
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        failedLoginCount: u.failedLoginCount,
        lockedUntil: u.lockedUntil,
        mustChangePassword: u.mustChangePassword,
        matchesGreenHill: matchDemo,
        matchesBlueRiver: matchAdmin,
      }),
    );
  }
}
main()
  .catch((e) => {
    console.error("Error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
