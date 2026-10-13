"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import * as usersService from "@/services/users";
import { Role } from "@/generated/prisma/client";

export interface UserActionResult {
  ok: boolean;
  message?: string;
  error?: string;
  temporaryPassword?: string;
  fieldErrors?: Record<string, string[]>;
  cancelledBookingsCount?: number;
}

export async function createUserAction(
  _prevState: UserActionResult | null,
  formData: FormData,
): Promise<UserActionResult> {
  const actor = await requireRole("MANAGER", "ADMIN");

  const name = formData.get("name");
  const email = formData.get("email");
  const role = formData.get("role");
  const siteId = formData.get("siteId");
  const sectionId = formData.get("sectionId");

  const result = await usersService.createUser(actor, {
    name: typeof name === "string" ? name : "",
    email: typeof email === "string" ? email : "",
    role: typeof role === "string" ? (role as Role) : Role.STAFF,
    siteId: typeof siteId === "string" ? siteId : undefined,
    sectionId: typeof sectionId === "string" ? sectionId : undefined,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath("/users");
  return {
    ok: true,
    message: result.message ?? "User created",
    temporaryPassword: result.data.temporaryPassword,
  };
}

export async function updateUserAction(
  id: string,
  _prevState: UserActionResult | null,
  formData: FormData,
): Promise<UserActionResult> {
  const actor = await requireRole("MANAGER", "ADMIN");

  const name = formData.get("name");
  const sectionId = formData.get("sectionId");
  const role = formData.get("role");
  const siteId = formData.get("siteId");

  const result = await usersService.updateUser(actor, id, {
    name: typeof name === "string" ? name : "",
    sectionId: typeof sectionId === "string" ? sectionId : undefined,
    role: typeof role === "string" ? (role as Role) : undefined,
    siteId: typeof siteId === "string" ? siteId : undefined,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
  return {
    ok: true,
    message: result.message ?? "User updated",
  };
}

export async function resetPasswordAction(id: string): Promise<UserActionResult> {
  const actor = await requireRole("MANAGER", "ADMIN");

  const result = await usersService.resetPassword(actor, id);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
  return {
    ok: true,
    message: result.message ?? "Password reset",
    temporaryPassword: result.data.temporaryPassword,
  };
}

export async function setActiveAction(id: string, isActive: boolean): Promise<UserActionResult> {
  const actor = await requireRole("MANAGER", "ADMIN");

  const result = await usersService.setActive(actor, id, isActive);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
  return {
    ok: true,
    message: result.message,
    cancelledBookingsCount: result.data.cancelledBookingsCount,
  };
}
