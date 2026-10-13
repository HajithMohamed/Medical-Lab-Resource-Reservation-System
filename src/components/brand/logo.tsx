import * as React from "react";
import { APP_NAME } from "@/config/brand";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" fill="currentColor" fillOpacity=".12" />
      <path
        d="M9 7v18M16 7v18M23 7v18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="13" y="15" width="6" height="8" rx="2" fill="#5fb3cc" />
    </svg>
  );
}

export function Logo({ subtitle, className }: { subtitle?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="flex flex-col min-w-0">
        <span className="font-bold text-[15px] leading-tight text-sidebar-foreground truncate">
          {APP_NAME}
        </span>
        {subtitle && (
          <span className="text-[12px] text-sidebar-muted leading-tight truncate">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
