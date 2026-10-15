import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  status?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "Back",
  status,
  meta,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 pb-2 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="space-y-1 min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-teal transition-colors mb-1"
          >
            <ChevronLeft className="size-3.5" />
            <span>{backLabel}</span>
          </Link>
        )}
        {eyebrow && (
          <div className="text-[11px] font-extrabold tracking-[0.14em] uppercase text-teal">
            {eyebrow}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-navy leading-tight">
            {title}
          </h1>
          {status && <div className="shrink-0">{status}</div>}
        </div>
        {meta && <div className="text-xs text-muted font-medium">{meta}</div>}
        {description && <p className="text-xs sm:text-[13.5px] text-muted">{description}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-1 md:pt-0">{actions}</div>
      )}
    </div>
  );
}
