import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-[#334155] bg-[#060e1d] px-3 py-2 text-sm text-white placeholder:text-[#879390] transition-colors outline-none focus-visible:border-[#6cd8cb] focus-visible:ring-1 focus-visible:ring-[#6cd8cb] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#141c2b] disabled:text-[#94a3b8] disabled:opacity-60 aria-invalid:border-rose-500 aria-invalid:ring-1 aria-invalid:ring-rose-500",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
