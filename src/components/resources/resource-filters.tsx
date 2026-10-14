"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResourceFiltersProps {
  sites: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; name: string }>;
  currentFilters: {
    search?: string;
    siteId?: string;
    categoryId?: string;
    sectionId?: string;
    status?: string;
  };
}

export function ResourceFilters({
  sites,
  categories,
  sections,
  currentFilters,
}: ResourceFiltersProps) {
  const hasActiveFilters = Boolean(
    (currentFilters.search && currentFilters.search.trim() !== "") ||
    (currentFilters.siteId && currentFilters.siteId.trim() !== "") ||
    (currentFilters.categoryId && currentFilters.categoryId.trim() !== "") ||
    (currentFilters.sectionId && currentFilters.sectionId.trim() !== "") ||
    (currentFilters.status && currentFilters.status.trim() !== ""),
  );

  return (
    <form
      method="GET"
      action="/resources"
      className="flex flex-wrap items-center gap-2.5 bg-[#141c2b] p-3 rounded-lg border border-[#334155] shadow-xs"
    >
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] sm:max-w-[260px]">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-[#94a3b8] pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          name="search"
          defaultValue={currentFilters.search ?? ""}
          placeholder="Search by instrument name"
          aria-label="Search by name"
          className="h-9 w-full rounded-md border border-[#334155] bg-[#060e1d] pl-9 pr-3 text-xs font-mono text-[#dbe2f8] placeholder:text-[#879390] focus:border-[#6cd8cb] focus:outline-none transition-colors"
        />
      </div>

      {/* Site Filter */}
      <div className="min-w-[140px]">
        <select
          name="siteId"
          defaultValue={currentFilters.siteId ?? ""}
          aria-label="Filter by site"
          className="h-9 w-full rounded-md border border-[#334155] bg-[#060e1d] px-2.5 text-xs font-mono text-[#dbe2f8] focus:border-[#6cd8cb] focus:outline-none cursor-pointer transition-colors"
        >
          <option value="">All sites</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      {/* Category Filter */}
      <div className="min-w-[150px]">
        <select
          name="categoryId"
          defaultValue={currentFilters.categoryId ?? ""}
          aria-label="Filter by category"
          className="h-9 w-full rounded-md border border-[#334155] bg-[#060e1d] px-2.5 text-xs font-mono text-[#dbe2f8] focus:border-[#6cd8cb] focus:outline-none cursor-pointer transition-colors"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Section Filter */}
      <div className="min-w-[150px]">
        <select
          name="sectionId"
          defaultValue={currentFilters.sectionId ?? ""}
          aria-label="Filter by owning section"
          className="h-9 w-full rounded-md border border-[#334155] bg-[#060e1d] px-2.5 text-xs font-mono text-[#dbe2f8] focus:border-[#6cd8cb] focus:outline-none cursor-pointer transition-colors"
        >
          <option value="">All sections</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div className="min-w-[170px]">
        <select
          name="status"
          defaultValue={currentFilters.status ?? ""}
          aria-label="Filter by status"
          className="h-9 w-full rounded-md border border-[#334155] bg-[#060e1d] px-2.5 text-xs font-mono text-[#dbe2f8] focus:border-[#6cd8cb] focus:outline-none cursor-pointer transition-colors"
        >
          <option value="">Active & Lockout</option>
          <option value="ACTIVE">Active only</option>
          <option value="OUT_OF_SERVICE">Lockout (Out of service)</option>
          <option value="RETIRED">Retired</option>
          <option value="ALL">All statuses</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        <Button
          type="submit"
          size="sm"
          className="h-9 px-3 bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs font-mono"
        >
          Apply
        </Button>
        {hasActiveFilters && (
          <Button asChild variant="ghost" size="sm" className="h-9 text-xs font-mono">
            <Link href="/resources" className="text-[#94a3b8] hover:text-white">
              Clear
            </Link>
          </Button>
        )}
      </div>
    </form>
  );
}
