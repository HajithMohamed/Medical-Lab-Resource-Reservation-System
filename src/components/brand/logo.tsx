import * as React from "react";
import { APP_NAME } from "@/config/brand";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-9 h-9 rounded-lg bg-primary/15 border border-primary/40 flex items-center justify-center text-primary shrink-0 shadow-xs",
        className,
      )}
      aria-hidden="true"
    >
      <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
        <circle
          cx="24"
          cy="24"
          r="16"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeOpacity="0.4"
        />
        <path
          d="M24 12v24M12 24h24"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function Logo({ subtitle, className }: { subtitle?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="flex flex-col min-w-0">
        <span className="font-bold text-[14px] tracking-tight leading-tight text-sidebar-foreground truncate">
          {APP_NAME}
        </span>
        <span className="font-mono text-[10.5px] text-sidebar-muted leading-tight truncate">
          {subtitle ?? "Precision Clinical Ops"}
        </span>
      </div>
    </div>
  );
}
