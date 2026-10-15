import * as React from "react";
import { cn } from "@/lib/utils";

export interface DefinitionItem {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  span?: 1 | 2;
}

export interface DefinitionGridProps {
  items: DefinitionItem[];
  emptyMessage?: string;
  className?: string;
}

export function DefinitionGrid({
  items,
  emptyMessage = "No details recorded",
  className,
}: DefinitionGridProps) {
  // Filter out null/undefined/empty string items
  const validItems = items.filter(
    (item) => item.value !== undefined && item.value !== null && item.value !== "",
  );

  if (validItems.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-muted italic bg-canvas/40 rounded-xl border border-line/60">
        {emptyMessage}
      </div>
    );
  }

  return (
    <dl className={cn("grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4", className)}>
      {validItems.map((item, index) => (
        <div
          key={index}
          className={cn(
            "space-y-1 py-1 border-b border-line/40 last:border-b-0 sm:last:border-b-0",
            item.span === 2 && "sm:col-span-2",
          )}
        >
          <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">
            {item.label}
          </dt>
          <dd className="text-sm font-semibold text-navy leading-relaxed">{item.value}</dd>
          {item.hint && <div className="text-[11px] text-muted">{item.hint}</div>}
        </div>
      ))}
    </dl>
  );
}
