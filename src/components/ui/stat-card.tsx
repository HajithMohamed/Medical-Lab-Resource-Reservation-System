import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  icon: LucideIcon | React.ReactNode;
  iconVariant?: "mint" | "green" | "blue" | "amber" | "danger";
  label: string;
  value: string | number;
  hint?: string;
  hintTone?: "neutral" | "good" | "warn" | "danger" | "muted";
  hintVariant?: "neutral" | "good" | "warn" | "danger" | "muted";
  className?: string;
}

export function StatCard({
  icon,
  iconVariant = "mint",
  label,
  value,
  hint,
  hintTone,
  hintVariant,
  className,
}: StatCardProps) {
  const effectiveTone = hintVariant ?? hintTone ?? "neutral";

  const iconVariants = {
    mint: "bg-teal-soft text-teal",
    green: "bg-green-soft text-green",
    blue: "bg-blue-soft text-blue",
    amber: "bg-amber-soft text-amber-strong",
    danger: "bg-red-soft text-red",
  };

  const hintColors = {
    neutral: "text-muted",
    muted: "text-muted",
    good: "text-green font-semibold",
    warn: "text-amber font-semibold",
    danger: "text-red font-semibold",
  };

  return (
    <article
      className={cn(
        "bg-card border border-card-edge rounded-2xl p-4 shadow-v4 grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1 items-center transition-shadow hover:shadow-md",
        className,
      )}
    >
      <span
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 self-start mt-0.5",
          iconVariants[iconVariant],
        )}
        aria-hidden="true"
      >
        {React.isValidElement(icon)
          ? icon
          : (() => {
              const Icon = icon as LucideIcon;
              return <Icon className="size-5" />;
            })()}
      </span>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-bold text-muted leading-tight truncate">{label}</span>
        <span className="text-[28px] font-extrabold text-navy leading-tight tab tracking-tight mt-0.5">
          {value}
        </span>
      </div>
      {hint && (
        <span
          className={cn(
            "text-xs col-span-2 pt-1.5 border-t border-line mt-1",
            hintColors[effectiveTone],
          )}
        >
          {hint}
        </span>
      )}
    </article>
  );
}

export function StatRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3.5", className)}>{children}</div>;
}
