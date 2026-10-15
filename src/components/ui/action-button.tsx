"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { ACTION_DEFINITIONS, type ActionKey, type ActionVariant } from "@/config/actions";
import { cn } from "@/lib/utils";

export interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  action: ActionKey;
  variant?: ActionVariant;
  size?: "lg" | "md" | "sm" | "icon" | "sticky";
  label?: string;
  loading?: boolean;
  iconOnly?: boolean;
  className?: string;
}

export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      action,
      variant,
      size = "md",
      label,
      loading = false,
      iconOnly = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const def = ACTION_DEFINITIONS[action] ?? {
      label: action,
      icon: Loader2,
      variant: "secondary" as ActionVariant,
    };

    const finalVariant = variant ?? def.variant;
    const finalLabel = label ?? (typeof children === "string" ? children : def.label);
    const IconComponent = def.icon;

    const variantStyles: Record<ActionVariant, string> = {
      primary:
        "bg-gradient-to-br from-teal to-teal-deep text-white shadow-teal hover:opacity-95 active:scale-[0.98] border-0",
      secondary:
        "bg-card border border-card-edge text-navy hover:bg-mint hover:text-teal-deep shadow-2xs active:scale-[0.98]",
      soft: "bg-mint text-teal-deep border border-teal-line hover:bg-teal-soft active:scale-[0.98]",
      danger: "bg-red-soft border border-red text-red hover:bg-red/10 active:scale-[0.98]",
      link: "text-teal-deep font-bold hover:underline bg-transparent border-0 p-0 shadow-none",
      icon: "w-10 h-10 rounded-xl border border-card-edge bg-card text-navy flex items-center justify-center hover:bg-mint shadow-2xs p-0 active:scale-[0.98]",
      menuItem:
        "w-full text-left bg-transparent border-0 hover:bg-mint text-navy font-semibold px-2.5 py-2",
    };

    const sizeStyles = {
      lg: "h-[46px] px-5 text-sm font-bold rounded-xl",
      md: "h-10 px-4 text-xs font-bold rounded-xl",
      sm: "h-8 px-3 text-xs font-bold rounded-xl",
      sticky: "h-12 px-5 text-sm font-bold rounded-xl w-full",
      icon: "w-10 h-10 p-0 rounded-xl flex items-center justify-center",
    };

    const isIconOnly = iconOnly || finalVariant === "icon" || size === "icon";

    return (
      <button
        ref={ref}
        type={props.type ?? "button"}
        disabled={disabled || loading}
        aria-label={isIconOnly ? finalLabel : undefined}
        title={isIconOnly ? finalLabel : undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-sans transition-all outline-none focus-visible:ring-2 focus-visible:ring-focus cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
          variantStyles[finalVariant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className={cn("animate-spin shrink-0", size === "lg" ? "size-5" : "size-4")} />
        ) : (
          <IconComponent
            className={cn("shrink-0", size === "lg" ? "size-5" : "size-4")}
            aria-hidden="true"
          />
        )}
        {!isIconOnly && <span>{children ?? finalLabel}</span>}
      </button>
    );
  },
);

ActionButton.displayName = "ActionButton";
