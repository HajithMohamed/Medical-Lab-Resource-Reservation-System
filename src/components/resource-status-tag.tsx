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
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
          className,
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" aria-hidden="true" />
        <span>Active</span>
      </span>
    );
  }

  if (status === "OUT_OF_SERVICE") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-rose-500/15 text-rose-300 border border-rose-500/40",
          className,
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" aria-hidden="true" />
        <span>Out of service</span>
      </span>
    );
  }

  if (status === "MAINTENANCE") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40",
          className,
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
        <span>Scheduled Service</span>
      </span>
    );
  }

  if (status === "RETIRED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#18202f] text-[#94a3b8] border border-[#334155]",
          className,
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8]/60 shrink-0" aria-hidden="true" />
        <span>Retired</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#18202f] text-[#94a3b8] border border-[#334155]",
        className,
      )}
    >
      <span>{status}</span>
    </span>
  );
}
