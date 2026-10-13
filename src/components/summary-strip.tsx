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
            className="p-3.5 rounded-lg bg-surface-container border border-outline-variant flex flex-col justify-between shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider truncate">
                {item.label}
              </span>
              {item.dotColor === "primary" && (
                <span className="w-2 h-2 rounded-full bg-primary ring-4 ring-primary/20 shrink-0" />
              )}
              {item.dotColor === "secondary" && (
                <span className="w-2 h-2 rounded-full bg-secondary ring-4 ring-secondary/20 shrink-0" />
              )}
              {item.dotColor === "tertiary" && (
                <span className="w-2 h-2 rounded-full bg-tertiary ring-4 ring-tertiary/20 shrink-0" />
              )}
              {item.dotColor === "error" && (
                <span className="w-2 h-2 rounded-full bg-error ring-4 ring-error/20 shrink-0" />
              )}
              {!item.dotColor && item.badge && <div className="shrink-0">{item.badge}</div>}
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-on-surface tabular-nums">{item.value}</span>
            </div>

            {item.hint && (
              <div className="mt-2 text-xs text-on-surface-variant flex items-center justify-between">
                <span>{item.hint}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
