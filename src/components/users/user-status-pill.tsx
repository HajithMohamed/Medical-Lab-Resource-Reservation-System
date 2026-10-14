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
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
            className,
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" aria-hidden="true" />
          Active
        </span>
      );

    case "MUST_CHANGE_PASSWORD":
      return (
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#6cd8cb]/15 text-[#6cd8cb] border border-[#6cd8cb]/30",
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
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40",
            className,
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
          Locked
        </span>
      );

    case "INACTIVE":
      return (
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#18202f] text-[#94a3b8] border border-[#334155]",
            className,
          )}
        >
          Deactivated
        </span>
      );
  }
}
