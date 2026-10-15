"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import * as equipmentService from "@/services/equipment";
import { EquipmentRecordKind, EquipmentOutcome } from "@/generated/prisma/client";

export interface EquipmentActionResult {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  cancelledBookingsCount?: number;
}

function getOptionalString(formData: FormData, key: string): string | undefined {
  const val = formData.get(key);
  return typeof val === "string" && val.trim() !== "" ? val.trim() : undefined;
}

export async function addEquipmentRecordAction(
  resourceId: string,
  _prevState: EquipmentActionResult | null,
  formData: FormData,
): Promise<EquipmentActionResult> {
  const actor = await requireRole("MANAGER", "ADMIN");

  const kind = formData.get("kind") as EquipmentRecordKind;
  const outcome = formData.get("outcome") as EquipmentOutcome;
  const performedOn = formData.get("performedOn");
  const performedBy = formData.get("performedBy");

  const result = await equipmentService.addEquipmentRecord(actor, resourceId, {
    kind,
    outcome,
    performedOn: typeof performedOn === "string" ? performedOn.trim() : "",
    performedBy: typeof performedBy === "string" ? performedBy.trim() : "",
    reference: getOptionalString(formData, "reference"),
    notes: getOptionalString(formData, "notes"),
    workPerformed: getOptionalString(formData, "workPerformed"),
    externalCompany: getOptionalString(formData, "externalCompany"),
    nextDueOn: getOptionalString(formData, "nextDueOn"),
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(`/resources/${resourceId}`);
  revalidatePath("/resources");
  revalidatePath("/equipment");
  revalidatePath("/calendar");
  revalidatePath("/bookings");

  return {
    ok: true,
    message: result.message ?? "Result recorded.",
    cancelledBookingsCount: result.data.cancelledBookingsCount,
  };
}

export async function markDoneAction(
  resourceId: string,
  tracker: "calibration" | "maintenance",
  _prevState: EquipmentActionResult | null,
  formData: FormData,
): Promise<EquipmentActionResult> {
  const actor = await requireRole("MANAGER", "ADMIN");

  const outcome = (formData.get("outcome") as EquipmentOutcome) ?? EquipmentOutcome.PASS;
  const performedBy = formData.get("performedBy");

  const result = await equipmentService.markDone(actor, resourceId, tracker, {
    outcome,
    performedBy: typeof performedBy === "string" ? performedBy.trim() : "",
    reference: getOptionalString(formData, "reference"),
    notes: getOptionalString(formData, "notes"),
    workPerformed: getOptionalString(formData, "workPerformed"),
    externalCompany: getOptionalString(formData, "externalCompany"),
    nextDueOn: getOptionalString(formData, "nextDueOn"),
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(`/resources/${resourceId}`);
  revalidatePath("/resources");
  revalidatePath("/equipment");
  revalidatePath("/calendar");
  revalidatePath("/bookings");

  return {
    ok: true,
    message: result.message ?? "Result recorded.",
    cancelledBookingsCount: result.data.cancelledBookingsCount,
  };
}

export async function markNotDoneAction(
  resourceId: string,
  tracker: "calibration" | "maintenance",
  _prevState: EquipmentActionResult | null,
  formData: FormData,
): Promise<EquipmentActionResult> {
  const actor = await requireRole("MANAGER", "ADMIN");

  const notes = formData.get("notes");
  const plannedDate = getOptionalString(formData, "plannedDate");

  const result = await equipmentService.markNotDone(actor, resourceId, tracker, {
    notes: typeof notes === "string" ? notes.trim() : "",
    plannedDate,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(`/resources/${resourceId}`);
  revalidatePath("/resources");
  revalidatePath("/equipment");
  revalidatePath("/calendar");
  revalidatePath("/bookings");

  return {
    ok: true,
    message: result.message ?? "Saved as not done.",
  };
}
