import * as React from "react";
import { cn } from "@/lib/utils";

export interface SummaryStripItem {
  label: string;
  value: React.ReactNode;
  hint?: string;
}

export interface SummaryStripProps {
  items: SummaryStripItem[];
  className?: string;
}

export function SummaryStrip({ items, className }: SummaryStripProps) {
  const displayItems = items.slice(0, 4);

  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-card border border-border rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-border overflow-hidden",
        className,
      )}
    >
      {displayItems.map((item, index) => (
        <div key={index} className="p-4 sm:px-5 sm:py-3.5 flex flex-col justify-center">
          <span className="text-2xl sm:text-[26px] font-bold text-foreground tabular-nums leading-tight">
            {item.value}
          </span>
          <span className="text-sm text-muted-foreground mt-0.5">{item.label}</span>
          {item.hint && <span className="text-xs text-muted-foreground mt-0.5">{item.hint}</span>}
        </div>
      ))}
    </div>
  );
}
