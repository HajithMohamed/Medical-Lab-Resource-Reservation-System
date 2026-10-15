import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function UsageLoading() {
  return (
    <div className="space-y-6 max-w-6xl animate-pulse">
      {/* Page Header Skeleton */}
      <div className="border-b border-[#334155]/60 pb-3 space-y-2">
        <Skeleton className="h-4 w-32 bg-[#1e293b]" />
        <Skeleton className="h-8 w-64 bg-[#1e293b]" />
        <Skeleton className="h-4 w-96 bg-[#1e293b]" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="bg-[#141c2b] p-4 rounded-xl border border-[#334155] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-40 bg-[#1e293b]" />
          <Skeleton className="h-9 w-40 bg-[#1e293b]" />
          <Skeleton className="h-9 w-48 bg-[#1e293b]" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 bg-[#1e293b]" />
          <Skeleton className="h-9 w-28 bg-[#1e293b]" />
        </div>
      </div>

      {/* Summary Strip Skeleton */}
      <div className="bg-[#141c2b] p-4 rounded-xl border border-[#334155] grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24 bg-[#1e293b]" />
            <Skeleton className="h-7 w-20 bg-[#1e293b]" />
          </div>
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 rounded-2xl bg-[#0f172a]/70 border border-[#1e293b] p-5 space-y-4">
          <Skeleton className="h-5 w-32 bg-[#1e293b]" />
          <Skeleton className="h-40 w-full bg-[#1e293b]/50" />
        </div>
        <div className="h-64 rounded-2xl bg-[#0f172a]/70 border border-[#1e293b] p-5 space-y-4">
          <Skeleton className="h-5 w-32 bg-[#1e293b]" />
          <Skeleton className="h-40 w-full bg-[#1e293b]/50" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-xl border border-[#334155] bg-[#141c2b] p-5 space-y-4">
        <Skeleton className="h-5 w-48 bg-[#1e293b]" />
        <Skeleton className="h-48 w-full bg-[#1e293b]/40" />
      </div>
    </div>
  );
}
