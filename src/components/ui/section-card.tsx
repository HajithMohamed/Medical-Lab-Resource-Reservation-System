import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionCardProps {
  number?: number | string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({
  number,
  title,
  description,
  action,
  children,
  className,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-[20px] bg-card border border-card-edge p-5 sm:p-6 shadow-v4 transition-shadow",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          {number !== undefined && (
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal font-extrabold text-xs">
              {number}
            </div>
          )}
          <div className="space-y-0.5">
            <h2 className="text-base sm:text-lg font-bold text-navy leading-snug">{title}</h2>
            {description && <p className="text-xs text-muted leading-relaxed">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
}
