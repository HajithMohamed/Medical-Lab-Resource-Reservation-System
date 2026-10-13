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
            "inline-flex items-center gap-1.5 rounded-full bg-pass-bg px-2.5 py-0.5 text-xs font-semibold text-pass border border-pass/30",
            className,
          )}
        >
          <span className="size-1.5 rounded-full bg-pass" aria-hidden="true" />
          Active
        </span>
      );

    case "MUST_CHANGE_PASSWORD":
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground border border-secondary-foreground/20",
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
            "inline-flex items-center rounded-full bg-maint px-2.5 py-0.5 text-xs font-semibold text-maint-ink border border-maint-edge/30",
            className,
          )}
        >
          Locked
        </span>
      );

    case "INACTIVE":
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground border border-border",
            className,
          )}
        >
          Inactive
        </span>
      );
  }
}
