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
        "flex flex-col items-center justify-center text-center p-8 border border-dashed border-[#334155] rounded-lg bg-[#141c2b]",
        className,
      )}
    >
      <div className="size-12 rounded-lg bg-[#18202f] border border-[#334155] flex items-center justify-center text-[#6cd8cb] mb-3 shadow-2xs">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      <p className="text-xs text-[#94a3b8] max-w-sm mb-4 font-mono leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
