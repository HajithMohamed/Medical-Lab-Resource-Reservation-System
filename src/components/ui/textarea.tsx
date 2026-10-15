// Customised for BenchBook: 15px font size and bg-card styling
import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-xl border border-card-edge bg-card px-3 py-2 text-xs sm:text-sm text-navy transition-colors outline-none placeholder:text-faint focus-visible:border-teal focus-visible:ring-1 focus-visible:ring-teal/30 disabled:cursor-not-allowed disabled:bg-canvas disabled:text-faint aria-invalid:border-red aria-invalid:ring-1 aria-invalid:ring-red/20 shadow-2xs",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
