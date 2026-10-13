import "server-only";

import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { COMMON_PASSWORDS } from "@/config/common-passwords";
import {
  BCRYPT_COST,
  BCRYPT_MAX_BYTES,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  TEMP_PASSWORD_ALPHABET,
  TEMP_PASSWORD_GROUPS,
  TEMP_PASSWORD_GROUP_LENGTH,
} from "@/config/rules";

/**
 * Hashes a plain password with bcrypt using BCRYPT_COST.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

/**
 * Compares a plain password against a bcrypt hash.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Validates a proposed new password against NIST SP 800-63B-4 rules.
 * Returns an error message or null if valid.
 */
export function checkNewPassword(password: string, email: string): string | null {
  // 1. Minimum length
  if (password.length < PASSWORD_MIN_LENGTH) {
    return "Use at least 15 characters. Tip: join three or four random words.";
  }

  // 2. Maximum length and bcrypt byte limit
  const byteLength = new TextEncoder().encode(password).length;
  if (password.length > PASSWORD_MAX_LENGTH || byteLength > BCRYPT_MAX_BYTES) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters and at most ${BCRYPT_MAX_BYTES} bytes.`;
  }

  // 3. Common or guessable passwords (compared in lowercase)
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return "This password is too common or easily guessed. Choose a different one.";
  }

  // 4. Does not contain the part of the email before "@" when that part has 3+ characters
  const emailUsername = email.split("@")[0]?.toLowerCase();
  if (
    emailUsername &&
    emailUsername.length >= 3 &&
    password.toLowerCase().includes(emailUsername)
  ) {
    return "Password must not contain your email username.";
  }

  // 5. Is not one character repeated
  if (new Set(password).size <= 1) {
    return "Password must not be a single repeated character.";
  }

  return null;
}

/**
 * Generates an easy-to-read temporary password using crypto.randomInt.
 * Example: k7mq-x4tr-9hwz-3pfd
 */
export function generateTemporaryPassword(): string {
  const groups: string[] = [];
  const alphabetLength = TEMP_PASSWORD_ALPHABET.length;

  for (let g = 0; g < TEMP_PASSWORD_GROUPS; g++) {
    let group = "";
    for (let c = 0; c < TEMP_PASSWORD_GROUP_LENGTH; c++) {
      const idx = randomInt(0, alphabetLength);
      group += TEMP_PASSWORD_ALPHABET[idx];
    }
    groups.push(group);
  }

  return groups.join("-");
}
