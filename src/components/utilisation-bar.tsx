import * as React from "react";
import { cn } from "@/lib/utils";

export interface UtilisationBarProps {
  percent: number;
  className?: string;
  showText?: boolean;
}

export function UtilisationBar({ percent, className, showText = true }: UtilisationBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <div
        role="img"
        aria-label={`${clamped}% utilisation`}
        className="h-2 w-28 sm:w-36 rounded-full bg-card-edge/70 overflow-hidden shrink-0 border border-line"
      >
        <div
          className="h-full rounded-full bg-teal transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showText && <span className="text-xs font-bold text-navy tab">{clamped}%</span>}
    </div>
  );
}
