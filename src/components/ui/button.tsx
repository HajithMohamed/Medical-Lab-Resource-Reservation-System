import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-150 outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold font-mono shadow-xs",
        outline:
          "border border-[#334155] bg-[#18202f] hover:bg-[#222a3a] text-[#dbe2f8] hover:text-white hover:border-[#6cd8cb]/50",
        secondary:
          "bg-[#18202f] text-[#dbe2f8] hover:bg-[#222a3a] hover:text-white border border-[#334155]",
        ghost: "text-[#dbe2f8] hover:bg-[#222a3a] hover:text-white border border-transparent",
        destructive:
          "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 border border-rose-500/30 hover:border-rose-500/50",
        link: "text-[#6cd8cb] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-2 px-4 text-xs font-mono",
        xs: "h-6 gap-1 rounded-md px-2 text-[11px] font-mono",
        sm: "h-8 gap-1.5 px-3 text-xs font-mono",
        lg: "h-10 gap-2 px-5 text-sm font-mono",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-10",
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
