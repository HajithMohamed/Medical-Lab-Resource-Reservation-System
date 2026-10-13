import "server-only";

import bcrypt from "bcryptjs";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { LOCK_MINUTES, MAX_FAILED_LOGINS } from "@/config/rules";
import { checkNewPassword, hashPassword, verifyPassword } from "@/lib/password";
import type { CurrentUser } from "@/lib/auth";

// Dummy bcrypt hash generated once at module load to prevent timing attacks when an email is not found
const DUMMY_HASH = bcrypt.hashSync("benchbook_dummy_timing_attack_mitigation", 12);

export interface AuthenticateSuccess {
  ok: true;
  user: CurrentUser & { sessionVersion: number };
}

export interface AuthenticateFailure {
  ok: false;
}

export type AuthenticateResult = AuthenticateSuccess | AuthenticateFailure;

export interface ChangePasswordSuccess {
  ok: true;
  sessionVersion: number;
}

export interface ChangePasswordFailure {
  ok: false;
  error: string;
}

export type ChangePasswordResult = ChangePasswordSuccess | ChangePasswordFailure;

/**
 * Authenticates a user with email and password.
 * Always performs password verification to resist timing attacks.
 * Uses a row-level lock (SELECT ... FOR UPDATE) inside a transaction to prevent brute-force race conditions.
 */
export async function authenticate(
  email: string,
  plainPassword: string,
  now: Date = new Date(),
): Promise<AuthenticateResult> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  // Always verify password to eliminate timing differences between existing and non-existing accounts
  const hashToVerify = user ? user.passwordHash : DUMMY_HASH;
  const isPasswordValid = await verifyPassword(plainPassword, hashToVerify);

  if (!user) {
    return { ok: false };
  }

  // Row-lock the user record inside a short transaction to serialize concurrent login attempts
  return db.$transaction<AuthenticateResult>(
    async (tx: Prisma.TransactionClient): Promise<AuthenticateResult> => {
      // Lock the user row
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id}::uuid FOR UPDATE`;

      const freshUser = await tx.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          siteId: true,
          sectionId: true,
          isActive: true,
          mustChangePassword: true,
          failedLoginCount: true,
          lockedUntil: true,
          sessionVersion: true,
          site: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!freshUser || !freshUser.isActive) {
        return { ok: false };
      }

      // Check if account is currently locked
      const isLocked = freshUser.lockedUntil !== null && freshUser.lockedUntil > now;
      if (isLocked) {
        return { ok: false };
      }

      if (!isPasswordValid) {
        const newFailedCount = freshUser.failedLoginCount + 1;
        if (newFailedCount >= MAX_FAILED_LOGINS) {
          const lockUntil = new Date(now.getTime() + LOCK_MINUTES * 60 * 1000);
          await tx.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: 0,
              lockedUntil: lockUntil,
            },
          });
        } else {
          await tx.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: newFailedCount,
            },
          });
        }
        return { ok: false };
      }

      // Successful login: reset counters and record lastLoginAt
      await tx.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: 0,
          lockedUntil: null,
          lastLoginAt: now,
        },
      });

      return {
        ok: true,
        user: {
          id: freshUser.id,
          name: freshUser.name,
          email: freshUser.email,
          role: freshUser.role,
          siteId: freshUser.siteId,
          siteName: freshUser.site?.name ?? null,
          sectionId: freshUser.sectionId,
          mustChangePassword: freshUser.mustChangePassword,
          sessionVersion: freshUser.sessionVersion,
        },
      };
    },
  );
}

/**
 * Changes a user's password.
 * Validates current password, checks new password with NIST rules,
 * updates the hash, clears mustChangePassword, and increments sessionVersion.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      sessionVersion: true,
    },
  });

  if (!user) {
    return { ok: false, error: "User not found." };
  }

  const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const validationError = checkNewPassword(newPassword, user.email);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  if (currentPassword === newPassword) {
    return { ok: false, error: "New password must be different from current password." };
  }

  const newHash = await hashPassword(newPassword);
  const nextSessionVersion = user.sessionVersion + 1;

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
      sessionVersion: nextSessionVersion,
    },
  });

  return { ok: true, sessionVersion: nextSessionVersion };
}
