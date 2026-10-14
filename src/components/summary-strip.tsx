import * as React from "react";
import { cn } from "@/lib/utils";

export interface SummaryStripItem {
  label: string;
  value: React.ReactNode;
  hint?: string;
  badge?: React.ReactNode;
  dotColor?: "primary" | "secondary" | "tertiary" | "error";
}

export interface SummaryStripProps {
  items: SummaryStripItem[];
  className?: string;
}

export function SummaryStrip({ items, className }: SummaryStripProps) {
  const displayItems = items.slice(0, 4);

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5", className)}>
      {displayItems.map((item, index) => {
        return (
          <div
            key={index}
            className="p-3.5 rounded-lg bg-[#141c2b] border border-[#334155] flex flex-col justify-between shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-[#94a3b8] uppercase tracking-wider truncate">
                {item.label}
              </span>
              {item.dotColor === "primary" && (
                <span className="w-2 h-2 rounded-full bg-[#6cd8cb] ring-4 ring-[#6cd8cb]/20 shrink-0" />
              )}
              {item.dotColor === "secondary" && (
                <span className="w-2 h-2 rounded-full bg-[#7bd0ff] ring-4 ring-[#7bd0ff]/20 shrink-0" />
              )}
              {item.dotColor === "tertiary" && (
                <span className="w-2 h-2 rounded-full bg-[#ffb77d] ring-4 ring-[#ffb77d]/20 shrink-0" />
              )}
              {item.dotColor === "error" && (
                <span className="w-2 h-2 rounded-full bg-rose-400 ring-4 ring-rose-400/20 shrink-0" />
              )}
              {!item.dotColor && item.badge && <div className="shrink-0">{item.badge}</div>}
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tabular-nums font-mono">
                {item.value}
              </span>
            </div>

            {item.hint && (
              <div className="mt-2 text-xs text-[#94a3b8] font-mono flex items-center justify-between">
                <span>{item.hint}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
