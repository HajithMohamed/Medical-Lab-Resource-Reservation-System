"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import * as resourcesService from "@/services/resources";
import { ResourceStatus } from "@/generated/prisma/client";

export interface ResourceActionResult {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  resourceId?: string;
  cancelledBookingsCount?: number;
}

export async function createResourceAction(
  _prevState: ResourceActionResult | null,
  formData: FormData,
): Promise<ResourceActionResult> {
  const actor = await requireRole("MANAGER", "ADMIN");

  const name = formData.get("name");
  const siteId = formData.get("siteId");
  const categoryId = formData.get("categoryId");
  const sectionId = formData.get("sectionId");
  const location = formData.get("location");
  const capacity = formData.get("capacity");

  const result = await resourcesService.createResource(actor, {
    name: typeof name === "string" ? name : "",
    siteId: typeof siteId === "string" ? siteId : "",
    categoryId: typeof categoryId === "string" ? categoryId : "",
    sectionId: typeof sectionId === "string" ? sectionId : "",
    location: typeof location === "string" ? location : undefined,
    capacity: typeof capacity === "string" && capacity.trim() !== "" ? capacity : undefined,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath("/resources");
  revalidatePath("/calendar");
  revalidatePath("/bookings");

  return {
    ok: true,
    message: result.message ?? "Resource added",
    resourceId: result.data.id,
  };
}

export async function updateResourceAction(
  id: string,
  _prevState: ResourceActionResult | null,
  formData: FormData,
): Promise<ResourceActionResult> {
  const actor = await requireRole("MANAGER", "ADMIN");

  const name = formData.get("name");
  const siteId = formData.get("siteId");
  const categoryId = formData.get("categoryId");
  const sectionId = formData.get("sectionId");
  const location = formData.get("location");
  const capacity = formData.get("capacity");

  const result = await resourcesService.updateResource(actor, id, {
    name: typeof name === "string" ? name : "",
    siteId: typeof siteId === "string" ? siteId : "",
    categoryId: typeof categoryId === "string" ? categoryId : "",
    sectionId: typeof sectionId === "string" ? sectionId : "",
    location: typeof location === "string" ? location : undefined,
    capacity: typeof capacity === "string" && capacity.trim() !== "" ? capacity : undefined,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath("/resources");
  revalidatePath(`/resources/${id}`);
  revalidatePath("/calendar");
  revalidatePath("/bookings");

  return {
    ok: true,
    message: result.message ?? "Changes saved",
    resourceId: result.data.id,
  };
}

export async function changeResourceStatusAction(
  id: string,
  _prevState: ResourceActionResult | null,
  formData: FormData,
): Promise<ResourceActionResult> {
  const actor = await requireRole("MANAGER", "ADMIN");

  const rawStatus = formData.get("status");
  const rawReason = formData.get("reason");

  const status =
    typeof rawStatus === "string" ? (rawStatus as ResourceStatus) : ResourceStatus.ACTIVE;
  const reason = typeof rawReason === "string" ? rawReason : undefined;

  const result = await resourcesService.changeStatus(actor, id, status, reason);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  revalidatePath("/resources");
  revalidatePath(`/resources/${id}`);
  revalidatePath(`/resources/${id}/status`);
  revalidatePath("/calendar");
  revalidatePath("/bookings");

  return {
    ok: true,
    message: result.message ?? "Changes saved",
    cancelledBookingsCount: result.data.cancelledBookingsCount,
  };
}
