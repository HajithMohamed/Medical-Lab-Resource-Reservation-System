"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { parseLabDateTime } from "@/lib/time";
import {
  createMaintenanceBlock,
  endBlockNow,
  cancelBlock,
  findClashes,
  type ClashingBookingInfo,
} from "@/services/maintenance";

const createBlockSchema = z.object({
  resourceId: z.string().uuid("Invalid resource ID."),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid start time."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid end time."),
  reason: z
    .string()
    .trim()
    .min(3, "Reason must be at least 3 characters.")
    .max(200, "Reason cannot exceed 200 characters."),
  cancelClashingBookings: z.boolean().optional(),
});

export type ActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  needsConfirmation?: boolean;
  clashes?: ClashingBookingInfo[];
  cancelledCount?: number;
};

/**
 * Server action to create a maintenance block.
 */
export async function createMaintenanceBlockAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("MANAGER", "ADMIN");

  const rawData = {
    resourceId: formData.get("resourceId"),
    startDate: formData.get("startDate"),
    startTime: formData.get("startTime"),
    endDate: formData.get("endDate"),
    endTime: formData.get("endTime"),
    reason: formData.get("reason"),
    cancelClashingBookings: formData.get("cancelClashingBookings") === "true",
  };

  const parsed = createBlockSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the errors in the form.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { resourceId, startDate, startTime, endDate, endTime, reason, cancelClashingBookings } =
    parsed.data;

  const startAt = parseLabDateTime(startDate, startTime);
  const endAt = parseLabDateTime(endDate, endTime);

  const result = await createMaintenanceBlock(actor, {
    resourceId,
    startAt,
    endAt,
    reason,
    cancelClashingBookings,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      needsConfirmation: result.needsConfirmation,
      clashes: result.clashes,
    };
  }

  revalidatePath("/equipment");
  revalidatePath("/maintenance");
  revalidatePath("/calendar");
  revalidatePath("/bookings");
  revalidatePath("/bookings/manage");
  revalidatePath("/overview");
  revalidatePath(`/resources/${resourceId}`);

  return {
    ok: true,
    cancelledCount: result.cancelledCount,
  };
}

/**
 * Server action to end a running maintenance block now.
 */
export async function endBlockNowAction(formData: FormData): Promise<void> {
  const actor = await requireRole("MANAGER", "ADMIN");
  const blockId = formData.get("blockId") as string;
  const resourceId = formData.get("resourceId") as string | undefined;

  if (!blockId) {
    throw new Error("Missing block ID.");
  }

  const result = await endBlockNow(actor, blockId);
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to end maintenance block.");
  }

  revalidatePath("/equipment");
  revalidatePath("/maintenance");
  revalidatePath("/calendar");
  revalidatePath("/bookings");
  revalidatePath("/bookings/manage");
  revalidatePath("/overview");
  if (resourceId) {
    revalidatePath(`/resources/${resourceId}`);
  }
}

/**
 * Server action to cancel a future maintenance block.
 */
export async function cancelMaintenanceBlockAction(formData: FormData): Promise<void> {
  const actor = await requireRole("MANAGER", "ADMIN");
  const blockId = formData.get("blockId") as string;
  const reason = (formData.get("reason") as string)?.trim() ?? "";
  const resourceId = formData.get("resourceId") as string | undefined;

  if (!blockId) {
    throw new Error("Missing block ID.");
  }

  if (reason.length < 3) {
    throw new Error("Cancellation reason must be at least 3 characters.");
  }

  const result = await cancelBlock(actor, blockId, reason);
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to cancel maintenance block.");
  }

  revalidatePath("/equipment");
  revalidatePath("/maintenance");
  revalidatePath("/calendar");
  revalidatePath("/bookings");
  revalidatePath("/bookings/manage");
  revalidatePath("/overview");
  if (resourceId) {
    revalidatePath(`/resources/${resourceId}`);
  }
}

/**
 * Checks for clashes on the fly before submission.
 */
export async function checkClashesAction(
  resourceId: string,
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
) {
  const actor = await requireRole("MANAGER", "ADMIN");
  const startAt = parseLabDateTime(startDate, startTime);
  const endAt = parseLabDateTime(endDate, endTime);

  return findClashes(actor, resourceId, startAt, endAt);
}
