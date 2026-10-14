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

function getOptionalString(formData: FormData, key: string): string | undefined {
  const val = formData.get(key);
  return typeof val === "string" && val.trim() !== "" ? val.trim() : undefined;
}

function getBoolean(formData: FormData, key: string): boolean {
  const val = formData.get(key);
  return val === "true" || val === "on" || val === "1";
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
    manufacturer: getOptionalString(formData, "manufacturer"),
    model: getOptionalString(formData, "model"),
    serialNumber: getOptionalString(formData, "serialNumber"),
    inServiceOn: getOptionalString(formData, "inServiceOn"),
    expectedServiceLifeYears: getOptionalString(formData, "expectedServiceLifeYears"),
    replacementReviewDueOn: getOptionalString(formData, "replacementReviewDueOn"),
    needsCalibration: getBoolean(formData, "needsCalibration"),
    calibrationIntervalDays: getOptionalString(formData, "calibrationIntervalDays"),
    lastCalibratedOn: getOptionalString(formData, "lastCalibratedOn"),
    calibratedBy: getOptionalString(formData, "calibratedBy"),
    calibrationReference: getOptionalString(formData, "calibrationReference"),
    nextCalibrationDueOn: getOptionalString(formData, "nextCalibrationDueOn"),
    needsMaintenance: getBoolean(formData, "needsMaintenance"),
    maintenanceIntervalDays: getOptionalString(formData, "maintenanceIntervalDays"),
    lastServicedOn: getOptionalString(formData, "lastServicedOn"),
    servicedBy: getOptionalString(formData, "servicedBy"),
    nextMaintenanceDueOn: getOptionalString(formData, "nextMaintenanceDueOn"),
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath("/resources");
  revalidatePath("/equipment");
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
    manufacturer: getOptionalString(formData, "manufacturer"),
    model: getOptionalString(formData, "model"),
    serialNumber: getOptionalString(formData, "serialNumber"),
    inServiceOn: getOptionalString(formData, "inServiceOn"),
    expectedServiceLifeYears: getOptionalString(formData, "expectedServiceLifeYears"),
    replacementReviewDueOn: getOptionalString(formData, "replacementReviewDueOn"),
    needsCalibration: getBoolean(formData, "needsCalibration"),
    calibrationIntervalDays: getOptionalString(formData, "calibrationIntervalDays"),
    lastCalibratedOn: getOptionalString(formData, "lastCalibratedOn"),
    calibratedBy: getOptionalString(formData, "calibratedBy"),
    calibrationReference: getOptionalString(formData, "calibrationReference"),
    nextCalibrationDueOn: getOptionalString(formData, "nextCalibrationDueOn"),
    needsMaintenance: getBoolean(formData, "needsMaintenance"),
    maintenanceIntervalDays: getOptionalString(formData, "maintenanceIntervalDays"),
    lastServicedOn: getOptionalString(formData, "lastServicedOn"),
    servicedBy: getOptionalString(formData, "servicedBy"),
    nextMaintenanceDueOn: getOptionalString(formData, "nextMaintenanceDueOn"),
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
  revalidatePath("/equipment");
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
  revalidatePath("/equipment");
  revalidatePath("/calendar");
  revalidatePath("/bookings");

  return {
    ok: true,
    message: result.message ?? "Changes saved",
    cancelledBookingsCount: result.data.cancelledBookingsCount,
  };
}
