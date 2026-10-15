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
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-soft text-green border border-green/20",
          className,
        )}
      >
        {showDot && <span className="size-1.5 rounded-full bg-green shrink-0" aria-hidden="true" />}
        <span>{displayText}</span>
      </span>
    );
  }

  if (status === "DUE_SOON") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-soft text-amber border border-amber-line",
          className,
        )}
      >
        {showDot && <span className="size-1.5 rounded-full bg-amber shrink-0" aria-hidden="true" />}
        <span>{displayText}</span>
      </span>
    );
  }

  if (status === "DUE_TODAY") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-soft text-amber-strong border border-amber-line shadow-2xs",
          className,
        )}
      >
        {showDot && (
          <span className="size-1.5 rounded-full bg-amber-strong shrink-0" aria-hidden="true" />
        )}
        <span>{displayText}</span>
      </span>
    );
  }

  if (status === "OVERDUE" || status === "FAILED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-red-soft text-red border border-red/30",
          className,
        )}
      >
        {showDot && <span className="size-1.5 rounded-full bg-red shrink-0" aria-hidden="true" />}
        <span>{displayText}</span>
      </span>
    );
  }

  // NOT_TRACKED or default
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-canvas text-muted border border-line",
        className,
      )}
    >
      {showDot && <span className="size-1.5 rounded-full bg-faint shrink-0" aria-hidden="true" />}
      <span>{displayText}</span>
    </span>
  );
}
