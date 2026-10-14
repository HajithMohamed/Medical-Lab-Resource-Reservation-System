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
        "p-3 bg-[#18202f] border-t border-[#334155] rounded-b-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#94a3b8]",
        className,
      )}
    >
      <div>
        Showing <strong className="text-white font-semibold">{start}-{end}</strong> of{" "}
        <strong className="text-white font-semibold">{totalCount}</strong> {itemLabel}
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        {currentPage > 1 ? (
          <Link
            href={getPageUrl(currentPage - 1)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#141c2b] border border-[#334155]/60 text-[#dbe2f8] hover:bg-[#222a3a] hover:text-white transition-colors"
          >
            <ChevronLeft className="size-3.5" />
            <span>Previous</span>
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#141c2b] border border-[#334155]/60 text-[#879390] opacity-50 cursor-not-allowed"
          >
            <ChevronLeft className="size-3.5" />
            <span>Previous</span>
          </button>
        )}

        <span className="px-2 text-[#6cd8cb] font-semibold">
          Page {currentPage} of {totalPages}
        </span>

        {currentPage < totalPages ? (
          <Link
            href={getPageUrl(currentPage + 1)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#141c2b] border border-[#334155]/60 text-[#dbe2f8] hover:bg-[#222a3a] hover:text-white transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="size-3.5" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#141c2b] border border-[#334155]/60 text-[#879390] opacity-50 cursor-not-allowed"
          >
            <span>Next</span>
            <ChevronRight className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
