"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ErrorSummaryProps {
  errors: Array<{ field?: string; message: string }>;
  className?: string;
}

export function ErrorSummary({ errors, className }: ErrorSummaryProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (errors.length > 0 && ref.current) {
      ref.current.focus();
    }
  }, [errors]);

  if (!errors || errors.length === 0) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby="error-summary-title"
      className={cn(
        "rounded-2xl border border-red/30 bg-red-soft p-4 sm:p-5 outline-none focus:ring-2 focus:ring-red",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-red text-white">
          <AlertCircle className="size-4" />
        </div>
        <div className="space-y-1">
          <h3 id="error-summary-title" className="text-sm font-bold text-red">
            There {errors.length === 1 ? "is a problem" : `are ${errors.length} problems`} with your
            submission
          </h3>
          <ul className="list-disc list-inside text-xs text-red space-y-0.5">
            {errors.map((err, idx) => (
              <li key={idx}>
                {err.field ? (
                  <a
                    href={`#${err.field}`}
                    className="font-medium underline hover:text-navy transition-colors"
                  >
                    {err.message}
                  </a>
                ) : (
                  <span>{err.message}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
