import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-150 outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-teal hover:bg-teal-deep text-white font-semibold shadow-xs",
        outline:
          "border border-card-edge bg-card hover:bg-mint text-navy hover:text-teal hover:border-teal/40 shadow-xs",
        secondary:
          "bg-canvas text-navy hover:bg-mint border border-card-edge",
        ghost: "text-muted hover:bg-mint hover:text-navy border border-transparent",
        destructive:
          "bg-red-soft text-red hover:bg-red/10 border border-red/20",
        link: "text-teal underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-2 px-4 text-xs font-medium",
        xs: "h-6 gap-1 rounded-md px-2 text-[11px] font-medium",
        sm: "h-8 gap-1.5 px-3 text-xs font-medium",
        lg: "h-10 gap-2 px-5 text-sm font-medium",
        icon: "size-9 rounded-lg",
        "icon-xs": "size-6 rounded-md",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
