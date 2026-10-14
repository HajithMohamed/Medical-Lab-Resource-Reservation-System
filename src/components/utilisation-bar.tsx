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
        className="h-2 w-36 rounded-full bg-[#060e1d] border border-[#334155]/80 overflow-hidden shrink-0"
      >
        <div
          className="h-full rounded-full bg-[#6cd8cb] transition-all duration-300 shadow-[0_0_8px_rgba(108,216,203,0.5)]"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showText && (
        <span className="text-xs font-bold font-mono tabular-nums text-slate-200">{clamped}%</span>
      )}
    </div>
  );
}
