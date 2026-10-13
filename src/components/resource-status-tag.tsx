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
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 font-mono text-[11px] font-bold tracking-wider shadow-2xs",
          className,
        )}
      >
        <span
          className="size-1.5 rounded-full bg-primary animate-pulse shrink-0"
          aria-hidden="true"
        />
        <span>ACTIVE</span>
      </span>
    );
  }

  if (status === "OUT_OF_SERVICE") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/40 font-mono text-[11px] font-bold tracking-wider shadow-2xs out-of-service-stripes",
          className,
        )}
      >
        <span className="size-1.5 rounded-full bg-destructive shrink-0" aria-hidden="true" />
        <span>LOCKOUT</span>
      </span>
    );
  }

  if (status === "RETIRED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-highest text-muted-foreground border border-border font-mono text-[11px] font-medium tracking-wider",
          className,
        )}
      >
        <span
          className="size-1.5 rounded-full bg-muted-foreground/60 shrink-0"
          aria-hidden="true"
        />
        <span>RETIRED</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-highest text-muted-foreground border border-border font-mono text-[11px] font-medium tracking-wider",
        className,
      )}
    >
      <span>{status}</span>
    </span>
  );
}
