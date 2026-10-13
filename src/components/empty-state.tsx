import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 border border-dashed border-outline-variant rounded-lg bg-surface-container",
        className,
      )}
    >
      <div className="size-12 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary mb-3 shadow-2xs">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-on-surface mb-1">{title}</h3>
      <p className="text-xs text-on-surface-variant max-w-sm mb-4 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
