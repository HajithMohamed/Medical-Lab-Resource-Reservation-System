import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#334155]/60",
        className,
      )}
    >
      <div className="space-y-0.5">
        {eyebrow && (
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#94a3b8]">
            {eyebrow}
          </div>
        )}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{title}</h1>
        {description && <p className="text-xs sm:text-sm text-[#94a3b8]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}
