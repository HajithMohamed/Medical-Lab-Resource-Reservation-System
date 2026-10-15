"use client";

import * as React from "react";
import { AutoFilter, ClearFiltersButton } from "@/components/auto-filter";
import { cn } from "@/lib/utils";

export interface FilterBarProps {
  action?: string;
  hasActiveFilters?: boolean;
  clearHref?: string;
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({
  action,
  hasActiveFilters = false,
  clearHref,
  children,
  className,
}: FilterBarProps) {
  return (
    <AutoFilter
      action={action}
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 bg-card p-3.5 rounded-2xl border border-card-edge shadow-v4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">{children}</div>
      {hasActiveFilters && clearHref && (
        <div className="flex items-center gap-2 shrink-0">
          <ClearFiltersButton href={clearHref} />
        </div>
      )}
    </AutoFilter>
  );
}
