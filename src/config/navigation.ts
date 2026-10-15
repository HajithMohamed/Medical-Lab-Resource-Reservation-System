import type { Role } from "@/generated/prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  CalendarSearch,
  FlaskConical,
  CalendarCheck,
  ClipboardList,
  Wrench,
  BarChart3,
  Users,
  Settings,
} from "lucide-react";

export type NavGroup = "main" | "manage" | "admin";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: readonly Role[];
  group: NavGroup;
}

export const NAV_ITEMS: readonly NavItem[] = [
  // main: Calendar, Find a slot, Resources, My bookings
  {
    label: "Calendar",
    href: "/calendar",
    icon: Calendar,
    roles: ["STAFF", "MANAGER", "ADMIN"],
    group: "main",
  },
  {
    label: "Find a slot",
    href: "/book",
    icon: CalendarSearch,
    roles: ["STAFF", "MANAGER"],
    group: "main",
  },
  {
    label: "Resources",
    href: "/resources",
    icon: FlaskConical,
    roles: ["STAFF", "MANAGER", "ADMIN"],
    group: "main",
  },
  {
    label: "My bookings",
    href: "/bookings",
    icon: CalendarCheck,
    roles: ["STAFF", "MANAGER"],
    group: "main",
  },
  // manage: Bookings (oversight), Maintenance & care, Usage, Users
  {
    label: "Bookings",
    href: "/bookings/manage",
    icon: ClipboardList,
    roles: ["MANAGER", "ADMIN"],
    group: "manage",
  },
  {
    label: "Maintenance & care",
    href: "/equipment",
    icon: Wrench,
    roles: ["MANAGER", "ADMIN"],
    group: "manage",
  },
  {
    label: "Usage",
    href: "/usage",
    icon: BarChart3,
    roles: ["MANAGER", "ADMIN"],
    group: "manage",
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    roles: ["MANAGER", "ADMIN"],
    group: "manage",
  },
  // admin: ADMIN
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["ADMIN"],
    group: "admin",
  },
];

/**
 * Pure function returning allowed navigation items for a given role.
 */
export function navItemsFor(role: Role | string): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role as Role));
}
