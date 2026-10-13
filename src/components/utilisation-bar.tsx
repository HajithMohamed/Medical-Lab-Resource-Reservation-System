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
        className="h-2.5 w-36 rounded-full bg-muted overflow-hidden shrink-0"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showText && (
        <span className="text-sm font-semibold tabular-nums text-foreground">{clamped}%</span>
      )}
    </div>
  );
}
