import * as React from "react";
import { cn } from "@/lib/utils";
import { TRACKER_STATUS_LABELS, type TrackerStatus } from "@/lib/equipment-status";

export interface EquipmentStatusTagProps {
  status: TrackerStatus;
  label?: string;
  className?: string;
  showDot?: boolean;
}

export function EquipmentStatusTag({
  status,
  label,
  className,
  showDot = true,
}: EquipmentStatusTagProps) {
  const displayText = label ?? TRACKER_STATUS_LABELS[status] ?? status;

  if (status === "CURRENT") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
          className,
        )}
      >
        {showDot && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
        )}
        <span>{displayText}</span>
      </span>
    );
  }

  if (status === "DUE_SOON") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30",
          className,
        )}
      >
        {showDot && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
        )}
        <span>{displayText}</span>
      </span>
    );
  }

  if (status === "DUE_TODAY") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/25 text-amber-200 border border-amber-500/50 shadow-xs",
          className,
        )}
      >
        {showDot && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse shrink-0"
            aria-hidden="true"
          />
        )}
        <span>{displayText}</span>
      </span>
    );
  }

  if (status === "OVERDUE" || status === "FAILED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/40",
          className,
        )}
      >
        {showDot && (
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" aria-hidden="true" />
        )}
        <span>{displayText}</span>
      </span>
    );
  }

  // NOT_TRACKED or default
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-normal bg-slate-500/10 text-slate-400 border border-slate-500/20",
        className,
      )}
    >
      {showDot && (
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" aria-hidden="true" />
      )}
      <span>{displayText}</span>
    </span>
  );
}
