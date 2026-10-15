import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { canManageMaintenance, type UserLike, type ResourceLike } from "@/lib/permissions";

/**
 * Flag indicating whether the /maintenance/new route exists.
 * In accordance with task requirements, if /maintenance/new does not exist yet,
 * the button will not be rendered.
 */
export const HAS_MAINTENANCE_NEW_ROUTE = true;

export interface BlockTimeButtonProps {
  actor: UserLike;
  resource: ResourceLike;
  reason?: "Calibration" | "Service" | string;
  className?: string;
  size?: "default" | "sm" | "xs";
  /** Test hook to verify rendering when route is enabled */
  enabled?: boolean;
}

export function BlockTimeButton({
  actor,
  resource,
  reason = "Calibration",
  className,
  size = "sm",
  enabled = HAS_MAINTENANCE_NEW_ROUTE,
}: BlockTimeButtonProps) {
  // If the /maintenance/new route does not exist yet, do not render the button
  if (!enabled) {
    return null;
  }

  // Enforce canManageMaintenance permission: site's MANAGER and ADMIN
  if (!canManageMaintenance(actor, resource)) {
    return null;
  }

  return (
    <Button asChild variant="secondary" size={size === "xs" ? "sm" : size} className={className}>
      <Link
        href={`/maintenance/new?resourceId=${resource.id}&reason=${encodeURIComponent(reason)}`}
      >
        Block time
      </Link>
    </Button>
  );
}
