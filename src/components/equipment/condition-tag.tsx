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

  if (condition === "WATCH") {
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

  if (condition === "POOR") {
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
