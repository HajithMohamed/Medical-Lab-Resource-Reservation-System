import * as React from "react";
import { cn } from "@/lib/utils";
import { type EquipmentCondition, CONDITION_LABELS } from "@/lib/equipment-condition";

export interface ConditionTagProps {
  condition: EquipmentCondition;
  label?: string;
  className?: string;
  showDot?: boolean;
}

export function ConditionTag({ condition, label, className, showDot = true }: ConditionTagProps) {
  const displayText = label ?? CONDITION_LABELS[condition] ?? condition;

  if (condition === "GOOD") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-soft text-green border border-green/20",
          className,
        )}
      >
        {showDot && (
          <span className="w-1.5 h-1.5 rounded-full bg-green shrink-0" aria-hidden="true" />
        )}
        <span>{displayText}</span>
      </span>
    );
  }

  if (condition === "WATCH") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-soft text-amber-strong border border-amber-line",
          className,
        )}
      >
        {showDot && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-strong shrink-0" aria-hidden="true" />
        )}
        <span>{displayText}</span>
      </span>
    );
  }

  if (condition === "POOR") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-soft text-red border border-red/20",
          className,
        )}
      >
        {showDot && (
          <span className="w-1.5 h-1.5 rounded-full bg-red shrink-0" aria-hidden="true" />
        )}
        <span>{displayText}</span>
      </span>
    );
  }

  // NOT_TRACKED or default
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-canvas text-muted border border-card-edge",
        className,
      )}
    >
      {showDot && (
        <span className="w-1.5 h-1.5 rounded-full bg-muted shrink-0" aria-hidden="true" />
      )}
      <span>{displayText}</span>
    </span>
  );
}
