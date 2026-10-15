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
        "flex flex-col items-center justify-center text-center p-8 sm:p-10 border border-card-edge rounded-2xl bg-card shadow-v4",
        className,
      )}
    >
      <div className="size-12 rounded-xl bg-teal-soft border border-teal-line flex items-center justify-center text-teal mb-3.5 shadow-2xs">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-navy mb-1.5 tracking-tight">{title}</h3>
      <p className="text-xs text-muted max-w-sm mb-4 leading-relaxed font-normal">{description}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
