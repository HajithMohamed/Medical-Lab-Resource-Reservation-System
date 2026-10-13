import { Prisma } from "@/generated/prisma/client";

/**
 * Checks if the error is a clash/overlap error on reservations.
 * With Prisma 7.10 + adapter-pg the clash arrives as code P2039,
 * message "Database error. Code: `23P01`. Message: `conflicting key value violates exclusion constraint "reservations_no_overlap"`".
 */
export function isOverlapError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.message.includes("reservations_no_overlap")
  );
}

/**
 * Checks if the error is a unique constraint violation (code P2002).
 */
export function isUniqueError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Checks if the error is a foreign key constraint violation (code P2003).
 */
export function isForeignKeyError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
}

/**
 * Checks if the error is a database CHECK constraint violation matching the given name.
 */
export function isCheckError(error: unknown, constraintName: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.message.includes(constraintName)
  );
}
