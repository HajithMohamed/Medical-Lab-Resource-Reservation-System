import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true);

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import { BCRYPT_COST } from "../src/config/rules";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const hash = await bcrypt.hash("green-hill-cloud-2026", BCRYPT_COST);

  // Update chamari.herath and reset failedLoginCount
  const chamari = await prisma.user.update({
    where: { email: "chamari.herath@lab.example" },
    data: {
      passwordHash: hash,
      failedLoginCount: 0,
      lockedUntil: null,
      mustChangePassword: false,
    },
  });
  console.log("Updated chamari:", chamari.email);

  // Also reset kasun.silva's failedLoginCount
  const kasun = await prisma.user.update({
    where: { email: "kasun.silva@lab.example" },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
  console.log("Reset kasun failed count:", kasun.email);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
