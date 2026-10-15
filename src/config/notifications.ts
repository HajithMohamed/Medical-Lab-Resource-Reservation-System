import type { Role } from "@/generated/prisma/client";

export type NotificationKindType =
  | "BOOKING_CANCELLED"
  | "EQUIPMENT_OUT_OF_SERVICE"
  | "DUE_SOON"
  | "DUE_TODAY"
  | "OVERDUE"
  | "REVIEW_DUE"
  | "RESOURCE_BACK_IN_SERVICE"
  | "SLOT_FREE";

export interface NotificationKindConfig {
  kind: NotificationKindType;
  label: string;
  description: string;
  defaultInApp: boolean;
  defaultEmail: boolean;
  canTurnOffInApp: boolean;
  roles: readonly Role[];
}

export const NOTIFICATION_CONFIGS: readonly NotificationKindConfig[] = [
  {
    kind: "BOOKING_CANCELLED",
    label: "Booking cancelled",
    description:
      "When someone else cancels your booking (due to maintenance, equipment issues, or manager intervention).",
    defaultInApp: true,
    defaultEmail: false,
    canTurnOffInApp: false, // Mandatory: cannot be turned off
    roles: ["STAFF", "MANAGER"],
  },
  {
    kind: "EQUIPMENT_OUT_OF_SERVICE",
    label: "Equipment out of service",
    description:
      "When laboratory equipment fails a verification check and is taken out of service.",
    defaultInApp: true,
    defaultEmail: false,
    canTurnOffInApp: true,
    roles: ["MANAGER", "ADMIN"],
  },
  {
    kind: "DUE_SOON",
    label: "Verification due soon",
    description:
      "Advance reminder when calibration or preventive maintenance is approaching its scheduled date.",
    defaultInApp: true,
    defaultEmail: false,
    canTurnOffInApp: true,
    roles: ["MANAGER"],
  },
  {
    kind: "DUE_TODAY",
    label: "Verification due today",
    description: "Reminder on the day an instrument calibration or maintenance task is due.",
    defaultInApp: true,
    defaultEmail: false,
    canTurnOffInApp: true,
    roles: ["MANAGER"],
  },
  {
    kind: "OVERDUE",
    label: "Verification overdue",
    description:
      "Urgent alert when equipment has passed its calibration or maintenance deadline without verification.",
    defaultInApp: true,
    defaultEmail: false,
    canTurnOffInApp: true,
    roles: ["MANAGER", "ADMIN"],
  },
  {
    kind: "REVIEW_DUE",
    label: "Replacement review due",
    description:
      "Notice when an instrument reaches the end of its service life or accumulates repeated repairs.",
    defaultInApp: true,
    defaultEmail: false,
    canTurnOffInApp: true,
    roles: ["MANAGER", "ADMIN"],
  },
  {
    kind: "RESOURCE_BACK_IN_SERVICE",
    label: "Resource back in service",
    description: "Notification when a resource you are watching is marked active again.",
    defaultInApp: true,
    defaultEmail: false,
    canTurnOffInApp: true,
    roles: ["STAFF", "MANAGER"],
  },
  {
    kind: "SLOT_FREE",
    label: "Time slot free",
    description:
      "Alert when a booking or maintenance block is cancelled, freeing up a time slot you are watching.",
    defaultInApp: true,
    defaultEmail: false,
    canTurnOffInApp: true,
    roles: ["STAFF", "MANAGER"],
  },
];

export function getNotificationConfig(kind: NotificationKindType): NotificationKindConfig {
  const match = NOTIFICATION_CONFIGS.find((c) => c.kind === kind);
  if (!match) {
    throw new Error(`Unknown notification kind: ${kind}`);
  }
  return match;
}

export function notificationConfigsForRole(role: Role | string): NotificationKindConfig[] {
  return NOTIFICATION_CONFIGS.filter((c) => c.roles.includes(role as Role));
}
