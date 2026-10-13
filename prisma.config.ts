// Prisma CLI settings (Prisma ORM 7).
// Prisma 7 does not read .env files by itself, so we load them the same
// way Next.js does: .env.development for local work, .env.test when
// NODE_ENV=test, and real environment variables in CI and production.
// Default import: the named import does not work in ESM.
import nextEnv from "@next/env";
import { defineConfig, env } from "prisma/config";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
