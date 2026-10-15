import "server-only";

import { z } from "zod";
import { db } from "@/lib/db";
import {
  NotificationKind,
  Role,
  type Prisma,
} from "@/generated/prisma/client";
import type { UserLike } from "@/lib/permissions";
import {
  getNotificationConfig,
  notificationConfigsForRole,
  type NotificationKindType,
} from "@/config/notifications";

export interface NotifyInTxPayload {
  kind: NotificationKind;
  title: string;
  body: string;
  link: string;
  resourceId?: string | null;
  dedupeKey?: string | null;
  actorId?: string | null;
}

export interface NotificationListItem {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string;
  resourceId: string | null;
  dedupeKey: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface UserNotificationPreferenceItem {
  kind: NotificationKind;
  label: string;
  description: string;
  inApp: boolean;
  email: boolean;
  canTurnOffInApp: boolean;
}

/**
 * Creates notifications inside an existing Prisma transaction.
 * - Drops the acting user so they never notify themselves.
 * - Applies each recipient's preferences (mandatory kinds like BOOKING_CANCELLED cannot be turned off).
 * - Inserts in-app notifications with createMany + skipDuplicates.
 * - Returns the list of recipient IDs that need an email (empty when email is disabled).
 */
export async function notifyInTx(
  tx: Prisma.TransactionClient,
  recipientIds: string[],
  payload: NotifyInTxPayload,
  explicitActorId?: string | null,
): Promise<{ count: number }> {
  const actorIdToDrop = explicitActorId ?? payload.actorId;

  // 1. Drop the actor and filter invalid IDs
  const filteredRecipients = Array.from(
    new Set(
      recipientIds.filter(
        (id): id is string => Boolean(id) && id !== actorIdToDrop,
      ),
    ),
  );

  if (filteredRecipients.length === 0) {
    return { count: 0 };
  }

  const kindConfig = getNotificationConfig(payload.kind as NotificationKindType);

  // 2. Fetch recipients' preferences for this kind
  const userPrefs = await tx.notificationPreference.findMany({
    where: {
      userId: { in: filteredRecipients },
      kind: payload.kind,
    },
  });

  const prefMap = new Map(userPrefs.map((p) => [p.userId, p]));

  const inAppRecipients: string[] = [];
  const emailRecipients: string[] = [];

  for (const recipientId of filteredRecipients) {
    const userPref = prefMap.get(recipientId);

    // inApp preference: if mandatory, always true; else check pref, fallback to default
    const inAppAllowed = !kindConfig.canTurnOffInApp
      ? true
      : userPref?.inApp ?? kindConfig.defaultInApp;

    if (inAppAllowed) {
      inAppRecipients.push(recipientId);
    }

    // email preference: check pref or default
    const emailAllowed = userPref?.email ?? kindConfig.defaultEmail;
    if (emailAllowed) {
      emailRecipients.push(recipientId);
    }
  }

  // 3. Insert in-app notifications with skipDuplicates
  let insertedCount = 0;
  if (inAppRecipients.length > 0) {
    const createRes = await tx.notification.createMany({
      data: inAppRecipients.map((userId) => ({
        userId,
        kind: payload.kind,
        title: payload.title,
        body: payload.body,
        link: payload.link,
        resourceId: payload.resourceId ?? null,
        dedupeKey: payload.dedupeKey ?? null,
      })),
      skipDuplicates: true,
    });
    insertedCount = createRes.count;
  }

  // In this system email delivery is disabled per configuration / user specification
  return { count: insertedCount };
}

/**
 * Returns active MANAGERs of the given site, plus active ADMINs if includeAdmins is true.
 */
export async function recipientsForSite(
  tx: Prisma.TransactionClient,
  siteId: string,
  options: { includeAdmins?: boolean } = {},
): Promise<string[]> {
  const managers = await tx.user.findMany({
    where: {
      siteId,
      role: Role.MANAGER,
      isActive: true,
    },
    select: { id: true },
  });

  const ids = managers.map((m) => m.id);

  if (options.includeAdmins) {
    const admins = await tx.user.findMany({
      where: {
        role: Role.ADMIN,
        isActive: true,
      },
      select: { id: true },
    });
    for (const a of admins) {
      if (!ids.includes(a.id)) {
        ids.push(a.id);
      }
    }
  }

  return ids;
}

/**
 * Lists notifications for the authenticated actor, strictly filtered by actor.id (Rule C8).
 */
export async function listMyNotifications(
  actor: UserLike,
  options: { page?: number; limit?: number; pageSize?: number } = {},
): Promise<{
  items: NotificationListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}> {
  if (!actor.id) {
    return { items: [], total: 0, page: 1, limit: 20, totalPages: 0, unreadCount: 0 };
  }

  const page = Math.max(1, options.page ?? 1);
  const limit = Math.max(1, Math.min(100, options.pageSize ?? options.limit ?? 20));
  const skip = (page - 1) * limit;

  const [items, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.notification.count({
      where: { userId: actor.id },
    }),
    db.notification.count({
      where: { userId: actor.id, readAt: null },
    }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    unreadCount,
  };
}

/**
 * Counts unread notifications for the signed-in user.
 */
export async function countUnread(actorOrId: UserLike | string): Promise<number> {
  const userId = typeof actorOrId === "string" ? actorOrId : actorOrId.id;
  if (!userId) return 0;
  return db.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}

/**
 * Polls for notifications for the actor: returns current unread count
 * and up to 10 notifications created after the given ISO timestamp.
 */
export async function pollMyNotifications(
  actor: UserLike,
  afterIso?: string | null,
): Promise<{ unread: number; items: NotificationListItem[] }> {
  if (!actor.id) {
    return { unread: 0, items: [] };
  }

  const afterDate = afterIso ? new Date(afterIso) : null;
  const isValidDate = afterDate && !isNaN(afterDate.getTime());

  const [unread, items] = await Promise.all([
    db.notification.count({
      where: {
        userId: actor.id,
        readAt: null,
      },
    }),
    db.notification.findMany({
      where: {
        userId: actor.id,
        ...(isValidDate ? { createdAt: { gt: afterDate } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    unread,
    items,
  };
}

/**
 * Marks one notification as read. Enforces personal data isolation:
 * returns not found if the notification belongs to another user.
 */
export async function markRead(
  actor: UserLike,
  notificationId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!actor.id) {
    return { ok: false, error: "Not authenticated" };
  }

  const existing = await db.notification.findUnique({
    where: { id: notificationId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== actor.id) {
    return { ok: false, error: "Notification not found" };
  }

  await db.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });

  return { ok: true };
}

/**
 * Marks all unread notifications for the actor as read.
 */
export async function markAllRead(
  actor: UserLike,
): Promise<{ ok: boolean; count: number }> {
  if (!actor.id) {
    return { ok: false, count: 0 };
  }

  const result = await db.notification.updateMany({
    where: {
      userId: actor.id,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return { ok: true, count: result.count };
}

/**
 * Retrieves the notification preferences for the signed-in actor,
 * merged with system defaults and role-scoped permissions.
 */
export async function getMyPreferences(
  actor: UserLike,
): Promise<UserNotificationPreferenceItem[]> {
  if (!actor.id) {
    return [];
  }

  const roleConfigs = notificationConfigsForRole(actor.role);
  const userPrefs = await db.notificationPreference.findMany({
    where: { userId: actor.id },
  });

  const prefMap = new Map(userPrefs.map((p) => [p.kind, p]));

  return roleConfigs.map((config) => {
    const saved = prefMap.get(config.kind as NotificationKind);
    return {
      kind: config.kind as NotificationKind,
      label: config.label,
      description: config.description,
      inApp: !config.canTurnOffInApp ? true : saved?.inApp ?? config.defaultInApp,
      email: saved?.email ?? config.defaultEmail,
      canTurnOffInApp: config.canTurnOffInApp,
    };
  });
}

const updatePreferenceSchema = z.object({
  kind: z.nativeEnum(NotificationKind),
  inApp: z.boolean(),
  email: z.boolean().optional().default(false),
});

/**
 * Updates a single notification preference for the actor.
 * Refuses turning off a mandatory in-app kind (e.g. BOOKING_CANCELLED).
 */
export async function updateMyPreference(
  actor: UserLike,
  rawInput: unknown,
): Promise<{ ok: boolean; error?: string }> {
  if (!actor.id) {
    return { ok: false, error: "Not authenticated" };
  }

  const parsed = updatePreferenceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid preference data." };
  }

  const { kind, inApp, email } = parsed.data;
  const config = getNotificationConfig(kind as NotificationKindType);

  if (!config.canTurnOffInApp && !inApp) {
    return {
      ok: false,
      error: `In-app notifications for "${config.label}" cannot be turned off.`,
    };
  }

  await db.notificationPreference.upsert({
    where: {
      userId_kind: {
        userId: actor.id,
        kind,
      },
    },
    update: {
      inApp,
      email,
    },
    create: {
      userId: actor.id,
      kind,
      inApp,
      email,
    },
  });

  return { ok: true };
}
