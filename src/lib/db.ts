import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  });

  return new PrismaClient({ adapter });
}

// In development Next.js reloads modules on every change, and each reload
// would otherwise open new database connections. We reuse one client stored
// on globalThis when env.NODE_ENV is not production.
const globalForPrisma = globalThis as unknown as {
  prismaGlobal: PrismaClient | undefined;
};

export const db: PrismaClient = globalForPrisma.prismaGlobal ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prismaGlobal = db;
}
