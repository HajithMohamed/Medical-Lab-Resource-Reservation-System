// Customised for BenchBook: 15px font size and bg-card styling
import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-lg border border-[#334155] bg-[#060e1d] px-3 py-2 text-[15px] text-slate-100 transition-colors outline-none placeholder:text-slate-500 focus-visible:border-[#6cd8cb] focus-visible:ring-1 focus-visible:ring-[#6cd8cb]/30 disabled:cursor-not-allowed disabled:bg-slate-900/50 disabled:opacity-50 aria-invalid:border-rose-500 aria-invalid:ring-1 aria-invalid:ring-rose-500/20",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
