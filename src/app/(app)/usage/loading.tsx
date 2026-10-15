import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function UsageLoading() {
  return (
    <div className="space-y-6 max-w-6xl animate-pulse">
      {/* Page Header Skeleton */}
      <div className="border-b border-card-edge pb-3 space-y-2">
        <Skeleton className="h-4 w-32 bg-card-edge" />
        <Skeleton className="h-8 w-64 bg-card-edge" />
        <Skeleton className="h-4 w-96 bg-card-edge" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="bg-card p-4 rounded-2xl border border-card-edge shadow-v4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-40 bg-card-edge" />
          <Skeleton className="h-9 w-40 bg-card-edge" />
          <Skeleton className="h-9 w-48 bg-card-edge" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 bg-card-edge" />
          <Skeleton className="h-9 w-28 bg-card-edge" />
        </div>
      </div>

      {/* Summary Strip Skeleton */}
      <div className="bg-card p-4 rounded-2xl border border-card-edge shadow-v4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24 bg-card-edge" />
            <Skeleton className="h-7 w-20 bg-card-edge" />
          </div>
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 rounded-2xl bg-card border border-card-edge shadow-v4 p-5 space-y-4">
          <Skeleton className="h-5 w-32 bg-card-edge" />
          <Skeleton className="h-40 w-full bg-card-edge/50" />
        </div>
        <div className="h-64 rounded-2xl bg-card border border-card-edge shadow-v4 p-5 space-y-4">
          <Skeleton className="h-5 w-32 bg-card-edge" />
          <Skeleton className="h-40 w-full bg-card-edge/50" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl border border-card-edge bg-card shadow-v4 p-5 space-y-4">
        <Skeleton className="h-5 w-48 bg-card-edge" />
        <Skeleton className="h-48 w-full bg-card-edge/50" />
      </div>
    </div>
  );
}
