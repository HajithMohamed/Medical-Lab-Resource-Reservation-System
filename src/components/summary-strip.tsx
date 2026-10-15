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
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4", className)}>
      {displayItems.map((item, index) => {
        return (
          <div
            key={index}
            className="p-4 rounded-2xl bg-card border border-card-edge flex flex-col justify-between shadow-v4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11.5px] font-black text-navy/85 uppercase tracking-[0.12em] truncate">
                {item.label}
              </span>
              {item.dotColor === "primary" && (
                <span className="size-2 rounded-full bg-teal ring-4 ring-teal/20 shrink-0" />
              )}
              {item.dotColor === "secondary" && (
                <span className="size-2 rounded-full bg-blue ring-4 ring-blue/20 shrink-0" />
              )}
              {item.dotColor === "tertiary" && (
                <span className="size-2 rounded-full bg-amber ring-4 ring-amber/20 shrink-0" />
              )}
              {item.dotColor === "error" && (
                <span className="size-2 rounded-full bg-red ring-4 ring-red/20 shrink-0" />
              )}
              {!item.dotColor && item.badge && <div className="shrink-0">{item.badge}</div>}
            </div>

            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy tabular-nums tracking-tight">
                {item.value}
              </span>
            </div>

            {item.hint && (
              <div className="mt-2 text-xs text-slate-600 font-medium flex items-center justify-between">
                <span>{item.hint}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
