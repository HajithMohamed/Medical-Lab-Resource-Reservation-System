import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="space-y-0.5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">{title}</h1>
        {description && <p className="text-xs sm:text-sm text-on-surface-variant">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}
