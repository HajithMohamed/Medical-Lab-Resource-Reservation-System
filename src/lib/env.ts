import "server-only";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z
      .string()
      .refine((url) => url.startsWith("postgres://") || url.startsWith("postgresql://"), {
        message: "Must start with postgres:// or postgresql://",
      }),
    SESSION_SECRET: z.string().min(32, { message: "Must be at least 32 characters" }),
    APP_TIME_ZONE: z.string().refine(
      (tz) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: tz });
          return true;
        } catch {
          return false;
        }
      },
      { message: "Must be a valid IANA time zone" },
    ),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      const disallowedPrefixes = ["dev-only", "test-only", "ci-only", "replace-with"];
      if (disallowedPrefixes.some((prefix) => data.SESSION_SECRET.startsWith(prefix))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SESSION_SECRET"],
          message:
            "Must not use placeholder secrets in production (cannot start with dev-only, test-only, ci-only, or replace-with)",
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  // next build loads every page to inspect it, but real secrets only exist when the app runs, so we check at run time.
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    const result = envSchema.safeParse(process.env);
    if (result.success) {
      return result.data;
    }
    return {
      NODE_ENV: (process.env.NODE_ENV as "development" | "test" | "production") || "development",
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://mock:mock@localhost:5432/mock",
      SESSION_SECRET: process.env.SESSION_SECRET || "mock-secret-at-least-32-characters-long",
      APP_TIME_ZONE: process.env.APP_TIME_ZONE || "Asia/Colombo",
    };
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${errorDetails}\nSee .env.example.`);
  }

  return result.data;
}

export const env: Env = loadEnv();
