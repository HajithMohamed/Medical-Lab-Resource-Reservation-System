import * as React from "react";
import { cn } from "@/lib/utils";

export type ResourceStatusString = "ACTIVE" | "OUT_OF_SERVICE" | "MAINTENANCE" | "RETIRED";

export interface ResourceStatusTagProps {
  status: ResourceStatusString | string;
  className?: string;
}

export function ResourceStatusTag({ status, className }: ResourceStatusTagProps) {
  if (status === "ACTIVE") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider bg-green-soft text-green",
          className,
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green shrink-0" aria-hidden="true" />
        <span>Active</span>
      </span>
    );
  }

  if (status === "OUT_OF_SERVICE") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider bg-red-soft text-red",
          className,
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red shrink-0" aria-hidden="true" />
        <span>Out of service</span>
      </span>
    );
  }

  if (status === "MAINTENANCE") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider bg-amber-soft text-amber",
          className,
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-strong shrink-0" aria-hidden="true" />
        <span>Maintenance</span>
      </span>
    );
  }

  if (status === "RETIRED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider bg-canvas text-muted border border-card-edge",
          className,
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-faint shrink-0" aria-hidden="true" />
        <span>Retired</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider bg-canvas text-muted border border-card-edge",
        className,
      )}
    >
      <span>{status}</span>
    </span>
  );
}

// Alias StatusPill to ResourceStatusTag per v4 design system
export const StatusPill = ResourceStatusTag;

export interface DuePillProps {
  label: string;
  variant?: "ok" | "warn" | "danger" | "neutral";
  className?: string;
}

export function DuePill({ label, variant = "neutral", className }: DuePillProps) {
  const styles = {
    ok: "bg-green-soft text-green",
    warn: "bg-amber-soft text-amber",
    danger: "bg-red-soft text-red",
    neutral: "bg-teal-soft text-teal-deep",
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider",
        styles,
        className,
      )}
    >
      <span>{label}</span>
    </span>
  );
}
