"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  markRead,
  markAllRead,
  updateMyPreference,
} from "@/services/notifications";
import {
  createWatch,
  cancelMyWatch,
} from "@/services/watches";
import { NotificationKind, ResourceWatchKind } from "@/generated/prisma/client";

export async function markNotificationReadAction(notificationId: string) {
  const user = await requireUser();
  const result = await markRead(user, notificationId);
  revalidatePath("/notifications");
  return result;
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  const result = await markAllRead(user);
  revalidatePath("/notifications");
  return result;
}

export async function updatePreferenceAction(
  kind: NotificationKind,
  inApp: boolean,
  email: boolean = false,
) {
  const user = await requireUser();
  const result = await updateMyPreference(user, { kind, inApp, email });
  revalidatePath("/notifications/settings");
  return result;
}

export async function createWatchAction(input: {
  resourceId: string;
  kind: ResourceWatchKind;
  wantedStart?: string | null;
  wantedEnd?: string | null;
  durationMinutes?: number | null;
  flexibleDay?: boolean;
}) {
  const user = await requireUser();
  const result = await createWatch(user, {
    resourceId: input.resourceId,
    kind: input.kind,
    wantedStart: input.wantedStart ? new Date(input.wantedStart) : null,
    wantedEnd: input.wantedEnd ? new Date(input.wantedEnd) : null,
    durationMinutes: input.durationMinutes,
    flexibleDay: input.flexibleDay,
  });

  revalidatePath("/notifications");
  revalidatePath("/book");
  revalidatePath(`/resources/${input.resourceId}`);
  return result;
}

export async function cancelWatchAction(watchId: string) {
  const user = await requireUser();
  const result = await cancelMyWatch(user, watchId);
  revalidatePath("/notifications");
  return result;
}
