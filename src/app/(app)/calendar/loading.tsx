import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="space-y-1.5 pb-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <Skeleton className="h-8 w-16" />
          <div className="flex gap-4 flex-1 justify-around pl-4">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-8 w-36" />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex gap-3 items-center">
              <Skeleton className="h-6 w-12 shrink-0" />
              <Skeleton className="h-6 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
