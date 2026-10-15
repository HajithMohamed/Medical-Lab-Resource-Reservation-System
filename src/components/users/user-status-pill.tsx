import * as React from "react";
import { cn } from "@/lib/utils";

export type UserStatusType = "ACTIVE" | "MUST_CHANGE_PASSWORD" | "LOCKED" | "INACTIVE";

export interface UserStatusPillProps {
  user?: {
    isActive: boolean;
    mustChangePassword: boolean;
    lockedUntil: Date | null;
  };
  isActive?: boolean;
  mustChangePassword?: boolean;
  lockedUntil?: Date | null;
  className?: string;
}

export function getUserStatusType(
  isActive: boolean,
  mustChangePassword: boolean,
  lockedUntil: Date | null,
): UserStatusType {
  const now = new Date();
  if (!isActive) {
    return "INACTIVE";
  }
  if (lockedUntil && new Date(lockedUntil) > now) {
    return "LOCKED";
  }
  if (mustChangePassword) {
    return "MUST_CHANGE_PASSWORD";
  }
  return "ACTIVE";
}

export function UserStatusPill({
  user,
  isActive: propIsActive,
  mustChangePassword: propMustChangePassword,
  lockedUntil: propLockedUntil,
  className,
}: UserStatusPillProps) {
  const isActive = user ? user.isActive : (propIsActive ?? true);
  const mustChangePassword = user ? user.mustChangePassword : (propMustChangePassword ?? false);
  const lockedUntil = user ? user.lockedUntil : (propLockedUntil ?? null);

  const status = getUserStatusType(isActive, mustChangePassword, lockedUntil);

  switch (status) {
    case "ACTIVE":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-soft text-teal-deep border border-teal-line",
            className,
          )}
        >
          <span className="size-1.5 rounded-full bg-teal shrink-0" aria-hidden="true" />
          Active
        </span>
      );

    case "MUST_CHANGE_PASSWORD":
      return (
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-soft text-teal border border-teal-soft",
            className,
          )}
        >
          Must change password
        </span>
      );

    case "LOCKED":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-soft text-amber border border-amber/30",
            className,
          )}
        >
          <span className="size-1.5 rounded-full bg-amber shrink-0" aria-hidden="true" />
          Locked
        </span>
      );

    case "INACTIVE":
      return (
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-canvas text-muted border border-card-edge",
            className,
          )}
        >
          Deactivated
        </span>
      );
  }
}
