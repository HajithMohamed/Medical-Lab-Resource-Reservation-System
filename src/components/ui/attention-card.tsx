import * as React from "react";
import { AlertCircle, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AttentionCardProps {
  variant?: "warn" | "danger" | "info" | "neutral";
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  hint?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function AttentionCard({
  variant = "warn",
  icon,
  title,
  subtitle,
  hint,
  actions,
  className,
}: AttentionCardProps) {
  const styles = {
    danger: {
      card: "bg-red-soft/70 border-red/30",
      iconTile: "bg-red-soft text-red",
      title: "text-red",
      subtitle: "text-red/90",
      hint: "text-red/80",
      defaultIcon: <AlertCircle className="size-4 text-red" />,
    },
    warn: {
      card: "bg-amber-soft/80 border-amber-line",
      iconTile: "bg-amber-soft text-amber-strong",
      title: "text-amber",
      subtitle: "text-amber/90",
      hint: "text-amber/80",
      defaultIcon: <AlertTriangle className="size-4 text-amber-strong" />,
    },
    info: {
      card: "bg-teal-soft/60 border-teal-line",
      iconTile: "bg-teal-soft text-teal",
      title: "text-teal-deep",
      subtitle: "text-muted",
      hint: "text-muted",
      defaultIcon: <Clock className="size-4 text-teal" />,
    },
    neutral: {
      card: "bg-card border-card-edge shadow-v4",
      iconTile: "bg-canvas text-navy",
      title: "text-navy",
      subtitle: "text-muted",
      hint: "text-muted",
      defaultIcon: <Clock className="size-4 text-muted" />,
    },
  }[variant];

  return (
    <div className={cn("rounded-2xl border p-4 sm:p-5 transition-shadow", styles.card, className)}>
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            styles.iconTile,
          )}
        >
          {icon ?? styles.defaultIcon}
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          <h3 className={cn("text-sm sm:text-[15px] font-extrabold leading-tight", styles.title)}>
            {title}
          </h3>
          {subtitle && (
            <div className={cn("text-xs font-semibold leading-relaxed", styles.subtitle)}>
              {subtitle}
            </div>
          )}
          {hint && (
            <div className={cn("text-[11.5px] font-medium leading-relaxed", styles.hint)}>
              {hint}
            </div>
          )}
          {actions && <div className="flex flex-wrap items-center gap-2 pt-3">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
