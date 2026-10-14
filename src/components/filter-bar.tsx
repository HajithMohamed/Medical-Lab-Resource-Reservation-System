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
        "flex flex-wrap items-center gap-3 bg-[#141c2b] p-3.5 rounded-xl border border-[#334155] shadow-xs",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">{children}</div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="submit"
          className="bg-[#6cd8cb] text-[#003732] hover:bg-[#29a195] hover:text-[#002421] font-bold shadow-xs"
        >
          Apply
        </Button>
        {hasActiveFilters && clearHref && (
          <Button asChild variant="ghost">
            <Link href={clearHref} className="text-sm text-slate-400 hover:text-slate-100">
              Clear filters
            </Link>
          </Button>
        )}
      </div>
    </form>
  );
}
