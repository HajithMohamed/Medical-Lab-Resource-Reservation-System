"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  itemLabel = "users",
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
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-3 px-1 text-sm text-muted-foreground",
        className,
      )}
    >
      <div>
        Showing <span className="font-semibold text-foreground">{start}</span>–
        <span className="font-semibold text-foreground">{end}</span> of{" "}
        <span className="font-semibold text-foreground">{totalCount}</span> {itemLabel}
      </div>

      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        {currentPage > 1 ? (
          <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2.5">
            <Link href={getPageUrl(currentPage - 1)}>
              <ChevronLeft className="size-4" />
              <span>Previous</span>
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5" disabled>
            <ChevronLeft className="size-4" />
            <span>Previous</span>
          </Button>
        )}

        <div className="flex items-center px-2 text-xs font-medium">
          Page {currentPage} of {totalPages}
        </div>

        {currentPage < totalPages ? (
          <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2.5">
            <Link href={getPageUrl(currentPage + 1)}>
              <span>Next</span>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5" disabled>
            <span>Next</span>
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
