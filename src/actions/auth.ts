"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticate, changePassword as changePasswordService } from "@/services/auth";
import { createSession, deleteSession } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";

export interface AuthActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(1, "New password is required"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation do not match.",
    path: ["confirmPassword"],
  });

const GENERIC_LOGIN_ERROR =
  "Email or password is incorrect, or the account is locked. Try again in a few minutes or ask your manager.";

/**
 * Server Action: authenticate and sign in.
 */
export async function login(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");

  const parsed = loginSchema.safeParse({
    email: typeof rawEmail === "string" ? rawEmail : "",
    password: typeof rawPassword === "string" ? rawPassword : "",
  });

  if (!parsed.success) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  const result = await authenticate(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  await createSession(result.user.id, result.user.sessionVersion);

  if (result.user.mustChangePassword) {
    redirect("/change-password");
  } else {
    redirect("/calendar");
  }
}

/**
 * Server Action: sign out and delete session.
 * Uses getCurrentUser on purpose: this action must work while mustChangePassword is true.
 */
export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}

/**
 * Server Action: change user's password.
 * Uses getCurrentUser on purpose: this action must work while mustChangePassword is true.
 */
export async function changePassword(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const rawCurrent = formData.get("currentPassword");
  const rawNew = formData.get("newPassword");
  const rawConfirm = formData.get("confirmPassword");

  const parsed = changePasswordFormSchema.safeParse({
    currentPassword: typeof rawCurrent === "string" ? rawCurrent : "",
    newPassword: typeof rawNew === "string" ? rawNew : "",
    confirmPassword: typeof rawConfirm === "string" ? rawConfirm : "",
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Invalid form input." };
  }

  const result = await changePasswordService(
    user.id,
    parsed.data.currentPassword,
    parsed.data.newPassword,
  );

  if (!result.ok) {
    return { error: result.error };
  }

  // Refresh current session with the updated session version so this device stays signed in
  await createSession(user.id, result.sessionVersion);
  redirect("/calendar");
}
