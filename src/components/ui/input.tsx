import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-card-edge bg-card px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors outline-none focus-visible:border-teal focus-visible:ring-2 focus-visible:ring-focus shadow-2xs disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted disabled:opacity-60 aria-invalid:border-red aria-invalid:ring-1 aria-invalid:ring-red",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
