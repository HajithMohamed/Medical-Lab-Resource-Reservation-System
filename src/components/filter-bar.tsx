import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
    <form
      method="GET"
      action={action}
      className={cn(
        "flex flex-wrap items-center gap-3 bg-card p-3 rounded-lg border border-border",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">{children}</div>
      <div className="flex items-center gap-2 shrink-0">
        <Button type="submit" variant="secondary">
          Apply
        </Button>
        {hasActiveFilters && clearHref && (
          <Button asChild variant="ghost">
            <Link href={clearHref} className="text-sm text-muted-foreground hover:text-foreground">
              Clear filters
            </Link>
          </Button>
        )}
      </div>
    </form>
  );
}
