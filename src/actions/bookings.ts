"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { parseLabDateTime } from "@/lib/time";
import { createBooking, cancelBooking } from "@/services/bookings";

export interface BookingActionState {
  ok?: boolean;
  reservationId?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  suggestions?: string[];
}

/**
 * Server Action: Create a resource booking.
 */
export async function createBookingAction(
  _prevState: BookingActionState | undefined,
  formData: FormData,
): Promise<BookingActionState> {
  const user = await requireUser();

  const resourceId = (formData.get("resourceId") as string) || "";
  const startDate = (formData.get("startDate") as string) || "";
  const startTime = (formData.get("startTime") as string) || "";
  const endDate = (formData.get("endDate") as string) || "";
  const endTime = (formData.get("endTime") as string) || "";
  const purpose = (formData.get("purpose") as string) || "";
  const attendeeCountRaw = formData.get("attendeeCount") as string;

  const fieldErrors: Record<string, string[]> = {};
  if (!resourceId) fieldErrors.resourceId = ["Please select a resource."];
  if (!startDate) fieldErrors.startDate = ["Start date is required."];
  if (!startTime) fieldErrors.startTime = ["Start time is required."];
  if (!endDate) fieldErrors.endDate = ["End date is required."];
  if (!endTime) fieldErrors.endTime = ["End time is required."];
  if (!purpose || purpose.trim().length < 3 || purpose.trim().length > 200) {
    fieldErrors.purpose = ["Purpose must be between 3 and 200 characters."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  let startAt: Date;
  let endAt: Date;
  try {
    startAt = parseLabDateTime(startDate, startTime);
    endAt = parseLabDateTime(endDate, endTime);
  } catch {
    return { error: "Invalid date or time entered." };
  }

  const attendeeCount =
    attendeeCountRaw && attendeeCountRaw.trim() !== "" ? Number(attendeeCountRaw) : null;

  const result = await createBooking(user, {
    resourceId,
    startAt,
    endAt,
    purpose,
    attendeeCount,
  });

  if (!result.ok) {
    return {
      error: result.error,
      fieldErrors: result.fieldErrors,
      suggestions: result.suggestions,
    };
  }

  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath(`/resources/${resourceId}`);

  return {
    ok: true,
    reservationId: result.data.id,
  };
}

/**
 * Server Action: Cancel a reservation with a reason.
 */
export async function cancelBookingAction(
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireUser();

  const reservationId = (formData.get("reservationId") as string) || "";
  const reason = (formData.get("reason") as string) || "";

  if (!reservationId) {
    return { ok: false, error: "Reservation ID is required." };
  }

  if (!reason || reason.trim().length < 3 || reason.trim().length > 200) {
    return {
      ok: false,
      error: "Cancellation reason must be between 3 and 200 characters.",
    };
  }

  const result = await cancelBooking(user, reservationId, reason);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/bookings");
  revalidatePath("/bookings/manage");
  revalidatePath("/calendar");
  revalidatePath(`/reservations/${reservationId}`);
  if (result.data.resourceId) {
    revalidatePath(`/resources/${result.data.resourceId}`);
  }

  return { ok: true };
}
