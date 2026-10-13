"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import * as settingsService from "@/services/settings";

export interface ActionResult {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

// ==========================================
// Sites Actions
// ==========================================

export async function createSiteAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");

  const name = formData.get("name");
  const address = formData.get("address");

  const result = await settingsService.createSite(actor, {
    name: typeof name === "string" ? name : "",
    address: typeof address === "string" ? address : undefined,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/sites");
  return { ok: true, message: result.message ?? "Site added" };
}

export async function updateSiteAction(
  id: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");

  const name = formData.get("name");
  const address = formData.get("address");

  const result = await settingsService.updateSite(actor, id, {
    name: typeof name === "string" ? name : "",
    address: typeof address === "string" ? address : undefined,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/sites");
  revalidatePath(`/settings/sites/${id}`);
  return { ok: true, message: result.message ?? "Changes saved" };
}

export async function deleteSiteAction(id: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");

  const result = await settingsService.deleteSite(actor, id);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/sites");
  return { ok: true, message: result.message ?? "Site deleted" };
}

// ==========================================
// Sections Actions
// ==========================================

export async function createSectionAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");

  const name = formData.get("name");

  const result = await settingsService.createSection(actor, {
    name: typeof name === "string" ? name : "",
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/sections");
  return { ok: true, message: result.message ?? "Section added" };
}

export async function updateSectionAction(
  id: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");

  const name = formData.get("name");

  const result = await settingsService.updateSection(actor, id, {
    name: typeof name === "string" ? name : "",
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/sections");
  revalidatePath(`/settings/sections/${id}`);
  return { ok: true, message: result.message ?? "Changes saved" };
}

export async function deleteSectionAction(id: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");

  const result = await settingsService.deleteSection(actor, id);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/sections");
  return { ok: true, message: result.message ?? "Section deleted" };
}

// ==========================================
// Categories Actions
// ==========================================

export async function createCategoryAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");

  const name = formData.get("name");
  const rawMinutes = formData.get("maxBookingMinutes");
  const maxBookingMinutes = Number(rawMinutes);
  const iconKey = formData.get("iconKey");

  const result = await settingsService.createCategory(actor, {
    name: typeof name === "string" ? name : "",
    maxBookingMinutes: Number.isNaN(maxBookingMinutes) ? 0 : maxBookingMinutes,
    iconKey: typeof iconKey === "string" ? iconKey : "other",
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/categories");
  return { ok: true, message: result.message ?? "Category added" };
}

export async function updateCategoryAction(
  id: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");

  const name = formData.get("name");
  const rawMinutes = formData.get("maxBookingMinutes");
  const maxBookingMinutes = Number(rawMinutes);
  const iconKey = formData.get("iconKey");

  const result = await settingsService.updateCategory(actor, id, {
    name: typeof name === "string" ? name : "",
    maxBookingMinutes: Number.isNaN(maxBookingMinutes) ? 0 : maxBookingMinutes,
    iconKey: typeof iconKey === "string" ? iconKey : "other",
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/categories");
  revalidatePath(`/settings/categories/${id}`);
  return { ok: true, message: result.message ?? "Changes saved" };
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");

  const result = await settingsService.deleteCategory(actor, id);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/categories");
  return { ok: true, message: result.message ?? "Category deleted" };
}
