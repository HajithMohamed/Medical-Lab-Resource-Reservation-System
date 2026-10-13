import * as React from "react";
import { cn } from "@/lib/utils";

export type ResourceStatusString = "ACTIVE" | "OUT_OF_SERVICE" | "RETIRED";

export interface ResourceStatusTagProps {
  status: ResourceStatusString | string;
  className?: string;
}

export function ResourceStatusTag({ status, className }: ResourceStatusTagProps) {
  if (status === "ACTIVE") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-semibold text-pass",
          className,
        )}
      >
        <span className="size-2 rounded-full bg-pass shrink-0" aria-hidden="true" />
        <span>Active</span>
      </span>
    );
  }

  if (status === "OUT_OF_SERVICE") {
    return (
      <span className={cn("status-tag text-tag-red bg-tag-red-bg border-tag-red/40", className)}>
        Out of service
      </span>
    );
  }

  if (status === "RETIRED") {
    return (
      <span className={cn("status-tag text-muted-foreground bg-muted border-border", className)}>
        Retired
      </span>
    );
  }

  return (
    <span className={cn("status-tag text-muted-foreground bg-muted border-border", className)}>
      {status}
    </span>
  );
}
