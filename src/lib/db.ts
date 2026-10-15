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

function getPrismaClient(): PrismaClient {
  const current = globalForPrisma.prismaGlobal;
  if (
    current &&
    "notification" in (current as unknown as Record<string, unknown>) &&
    "resourceWatch" in (current as unknown as Record<string, unknown>)
  ) {
    return current;
  }
  const client = createPrismaClient();
  if (env.NODE_ENV !== "production") {
    globalForPrisma.prismaGlobal = client;
  }
  return client;
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
export const prisma = db;
