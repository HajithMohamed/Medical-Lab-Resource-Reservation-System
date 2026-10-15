import { revalidatePath } from "next/cache";

/**
 * Revalidates views affected by booking lifecycle changes
 * (creating, cancelling, completing, or modifying bookings).
 */
export function revalidateBookingViews(resourceId?: string) {
  revalidatePath("/calendar");
  revalidatePath("/book");
  revalidatePath("/bookings");
  revalidatePath("/bookings/manage");
  revalidatePath("/equipment");
  revalidatePath("/usage");
  revalidatePath("/notifications");
  if (resourceId) {
    revalidatePath(`/resources/${resourceId}`);
  }
  revalidatePath("/", "layout");
}

/**
 * Revalidates views affected by resource configuration or status changes
 * (creating, editing, status change, or retiring resources).
 */
export function revalidateResourceViews(resourceId?: string) {
  revalidatePath("/resources");
  revalidatePath("/calendar");
  revalidatePath("/book");
  revalidatePath("/equipment");
  revalidatePath("/usage");
  if (resourceId) {
    revalidatePath(`/resources/${resourceId}`);
  }
  revalidatePath("/", "layout");
}

/**
 * Revalidates views affected by equipment actions
 * (maintenance blocks, calibration, servicing, checks, mark done/not done).
 */
export function revalidateEquipmentViews(resourceId?: string) {
  revalidatePath("/equipment");
  revalidatePath("/calendar");
  revalidatePath("/resources");
  revalidatePath("/bookings");
  revalidatePath("/bookings/manage");
  if (resourceId) {
    revalidatePath(`/resources/${resourceId}`);
  }
  revalidatePath("/", "layout");
}

/**
 * Revalidates views affected by notification state changes
 * (marking notifications as read or clearing alerts).
 */
export function revalidateNotificationViews() {
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}
