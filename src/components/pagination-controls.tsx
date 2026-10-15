"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  basePath: string;
  queryParams?: Record<string, string | undefined>;
  itemLabel?: string;
  className?: string;
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  basePath,
  queryParams = {},
  itemLabel = "items",
  alwaysShow = true,
  className,
}: PaginationControlsProps & { alwaysShow?: boolean }) {
  if (totalCount === 0 || (!alwaysShow && totalPages <= 1)) {
    return null;
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  const getPageUrl = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value && key !== "page") {
        params.set(key, value);
      }
    }
    if (page > 1) {
      params.set("page", String(page));
    }
    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  };

  return (
    <div
      className={cn(
        "p-3.5 bg-canvas border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted font-medium",
        className,
      )}
    >
      <div>
        Showing{" "}
        <strong className="text-navy font-bold tab">
          {start}-{end}
        </strong>{" "}
        of <strong className="text-navy font-bold tab">{totalCount}</strong> {itemLabel}
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        {currentPage > 1 ? (
          <Link
            href={getPageUrl(currentPage - 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-card border border-card-edge text-navy font-bold text-xs hover:bg-mint transition-colors shadow-2xs"
          >
            <ChevronLeft className="size-3.5" />
            <span>Previous</span>
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-card border border-card-edge text-faint font-bold text-xs opacity-50 cursor-not-allowed shadow-2xs"
          >
            <ChevronLeft className="size-3.5" />
            <span>Previous</span>
          </button>
        )}

        <span className="px-2 text-teal-deep font-extrabold tab">
          Page {currentPage} of {totalPages}
        </span>

        {currentPage < totalPages ? (
          <Link
            href={getPageUrl(currentPage + 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-card border border-card-edge text-navy font-bold text-xs hover:bg-mint transition-colors shadow-2xs"
          >
            <span>Next</span>
            <ChevronRight className="size-3.5" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-card border border-card-edge text-faint font-bold text-xs opacity-50 cursor-not-allowed shadow-2xs"
          >
            <span>Next</span>
            <ChevronRight className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
