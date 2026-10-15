import type { Role } from "@/generated/prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CalendarSearch,
  FlaskConical,
  CalendarCheck,
  ClipboardList,
  Wrench,
  ShieldCheck,
  BarChart3,
  Users,
  Settings,
} from "lucide-react";

export type NavBadgeKey = "dueCount";

export interface NavItemConfig {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: readonly Role[];
  badge?: NavBadgeKey;
}

export interface NavGroupConfig {
  eyebrow: string;
  items: NavItemConfig[];
}

export const NAV_ITEMS: readonly NavItemConfig[] = [
  // Workspace
  {
    label: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
    roles: ["STAFF", "MANAGER", "ADMIN"],
  },
  {
    label: "Find a slot",
    href: "/book",
    icon: CalendarSearch,
    roles: ["STAFF", "MANAGER"],
  },
  {
    label: "Resources",
    href: "/resources",
    icon: FlaskConical,
    roles: ["STAFF", "MANAGER", "ADMIN"],
  },
  {
    label: "My bookings",
    href: "/bookings",
    icon: CalendarCheck,
    roles: ["STAFF", "MANAGER"],
  },
  // Manage (Manager site-scoped & Admin network)
  {
    label: "Bookings",
    href: "/bookings/manage",
    icon: ClipboardList,
    roles: ["MANAGER", "ADMIN"],
  },
  {
    label: "Maintenance",
    href: "/equipment?tab=blocked",
    icon: Wrench,
    roles: ["MANAGER", "ADMIN"],
  },
  {
    label: "Equipment care",
    href: "/equipment?tab=today",
    icon: ShieldCheck,
    roles: ["MANAGER", "ADMIN"],
    badge: "dueCount",
  },
  {
    label: "Usage reports",
    href: "/usage",
    icon: BarChart3,
    roles: ["MANAGER", "ADMIN"],
  },
  // Accounts / Users
  {
    label: "Staff accounts",
    href: "/users",
    icon: Users,
    roles: ["MANAGER"],
  },
  {
    label: "Users & access",
    href: "/users",
    icon: Users,
    roles: ["ADMIN"],
  },
  // Admin settings
  {
    label: "Sites & settings",
    href: "/settings",
    icon: Settings,
    roles: ["ADMIN"],
  },
];

/**
 * Returns grouped navigation configuration for a specific role and site.
 */
export function getNavigationForRole(role: Role | string, siteName?: string): NavGroupConfig[] {
  const r = role as Role;

  if (r === "STAFF") {
    return [
      {
        eyebrow: "WORKSPACE",
        items: [
          { label: "Calendar", href: "/calendar", icon: CalendarDays, roles: ["STAFF"] },
          { label: "Find a slot", href: "/book", icon: CalendarSearch, roles: ["STAFF"] },
          { label: "Resources", href: "/resources", icon: FlaskConical, roles: ["STAFF"] },
          { label: "My bookings", href: "/bookings", icon: CalendarCheck, roles: ["STAFF"] },
        ],
      },
    ];
  }

  if (r === "MANAGER") {
    const siteLabel = siteName ? `MANAGE ${siteName.toUpperCase()} SITE` : "MANAGE SITE";
    return [
      {
        eyebrow: "WORKSPACE",
        items: [
          { label: "Calendar", href: "/calendar", icon: CalendarDays, roles: ["MANAGER"] },
          { label: "Find a slot", href: "/book", icon: CalendarSearch, roles: ["MANAGER"] },
          { label: "Resources", href: "/resources", icon: FlaskConical, roles: ["MANAGER"] },
          { label: "My bookings", href: "/bookings", icon: CalendarCheck, roles: ["MANAGER"] },
        ],
      },
      {
        eyebrow: siteLabel,
        items: [
          { label: "Bookings", href: "/bookings/manage", icon: ClipboardList, roles: ["MANAGER"] },
          {
            label: "Maintenance",
            href: "/equipment?tab=blocked",
            icon: Wrench,
            roles: ["MANAGER"],
          },
          {
            label: "Equipment care",
            href: "/equipment?tab=today",
            icon: ShieldCheck,
            roles: ["MANAGER"],
            badge: "dueCount",
          },
          { label: "Usage reports", href: "/usage", icon: BarChart3, roles: ["MANAGER"] },
          { label: "Staff accounts", href: "/users", icon: Users, roles: ["MANAGER"] },
        ],
      },
    ];
  }

  // ADMIN
  return [
    {
      eyebrow: "WORKSPACE",
      items: [
        { label: "Calendar", href: "/calendar", icon: CalendarDays, roles: ["ADMIN"] },
        { label: "Resources", href: "/resources", icon: FlaskConical, roles: ["ADMIN"] },
      ],
    },
    {
      eyebrow: "NETWORK",
      items: [
        { label: "Bookings", href: "/bookings/manage", icon: ClipboardList, roles: ["ADMIN"] },
        {
          label: "Maintenance",
          href: "/equipment?tab=blocked",
          icon: Wrench,
          roles: ["ADMIN"],
        },
        {
          label: "Equipment care",
          href: "/equipment?tab=today",
          icon: ShieldCheck,
          roles: ["ADMIN"],
          badge: "dueCount",
        },
        { label: "Usage reports", href: "/usage", icon: BarChart3, roles: ["ADMIN"] },
      ],
    },
    {
      eyebrow: "ADMINISTRATION",
      items: [
        { label: "Users & access", href: "/users", icon: Users, roles: ["ADMIN"] },
        { label: "Sites & settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
      ],
    },
  ];
}

/**
 * Flat list of navigation items allowed for a given role.
 */
export function navItemsFor(role: Role | string): NavItemConfig[] {
  const groups = getNavigationForRole(role);
  return groups.flatMap((g) => g.items);
}
