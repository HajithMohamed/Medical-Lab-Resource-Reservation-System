import * as React from "react";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "w-10 h-10 rounded-xl bg-gradient-to-br from-teal to-teal-deep flex items-center justify-center text-white shadow-teal shrink-0",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5 text-white"
      >
        <path d="M9 3h6M10 3v6.5L4.6 18.4A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.4-2.6L14 9.5V3" />
        <path d="M7.5 15h9" />
      </svg>
    </span>
  );
}

export function Logo({ subtitle, className }: { subtitle?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="flex flex-col min-w-0">
        <div className="font-extrabold text-[15.5px] tracking-tight leading-tight text-navy">
          BENCH<span className="text-teal font-extrabold">BOOK</span>
        </div>
        <div className="text-[9px] font-extrabold tracking-[0.14em] text-muted uppercase leading-tight truncate mt-0.5">
          {subtitle ?? "PRO · LAB OPERATIONS"}
        </div>
      </div>
    </div>
  );
}
