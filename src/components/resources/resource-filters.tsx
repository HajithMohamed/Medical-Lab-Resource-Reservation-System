"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSelectChange = (key: string, val: string) => {
    const params = new URLSearchParams(window.location.search);
    if (val) {
      params.set(key, val);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.replace(`/resources?${params.toString()}`, { scroll: false });
  };

  const handleSearchChange = (val: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (val.trim()) {
        params.set("search", val.trim());
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.replace(`/resources?${params.toString()}`, { scroll: false });
    }, 350);
  };

  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const removeFilter = (key: string) => {
    const params = new URLSearchParams(window.location.search);
    params.delete(key);
    params.set("page", "1");
    router.replace(`/resources?${params.toString()}`, { scroll: false });
  };

  const activeSite = sites.find((s) => s.id === currentFilters.siteId);
  const activeCategory = categories.find((c) => c.id === currentFilters.categoryId);
  const activeSection = sections.find((s) => s.id === currentFilters.sectionId);
  const hasActiveFilters = Boolean(
    activeSite || activeCategory || activeSection || currentFilters.status || currentFilters.search,
  );

  return (
    <div className="space-y-3">
      {/* Search and Dropdown Filters Bar - Direct selection, no Filter or Apply button */}
      <div className="flex flex-wrap items-center gap-2.5 bg-card p-3 sm:p-3.5 rounded-2xl border border-card-edge shadow-v4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            defaultValue={currentFilters.search ?? ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name..."
            aria-label="Search resources"
            className="h-10 w-full rounded-xl border border-card-edge bg-canvas pl-9 pr-3 text-xs font-semibold text-navy placeholder:text-muted focus:border-teal focus:bg-card outline-none transition-all"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Site */}
          <select
            value={currentFilters.siteId ?? ""}
            onChange={(e) => handleSelectChange("siteId", e.target.value)}
            className="h-10 rounded-xl border border-card-edge bg-canvas px-3 text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
            aria-label="Filter by site"
          >
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Category */}
          <select
            value={currentFilters.categoryId ?? ""}
            onChange={(e) => handleSelectChange("categoryId", e.target.value)}
            className="h-10 rounded-xl border border-card-edge bg-canvas px-3 text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Section */}
          <select
            value={currentFilters.sectionId ?? ""}
            onChange={(e) => handleSelectChange("sectionId", e.target.value)}
            className="h-10 rounded-xl border border-card-edge bg-canvas px-3 text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
            aria-label="Filter by section"
          >
            <option value="">All sections</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={currentFilters.status ?? ""}
            onChange={(e) => handleSelectChange("status", e.target.value)}
            className="h-10 rounded-xl border border-card-edge bg-canvas px-3 text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="OUT_OF_SERVICE">Out of service</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => router.replace("/resources", { scroll: false })}
              className="h-10 px-3 text-xs font-bold text-teal-deep hover:text-teal hover:bg-mint rounded-xl transition-colors cursor-pointer flex items-center gap-1 shrink-0"
            >
              <X className="size-3.5" />
              <span>Clear filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Badges */}
      {(activeSite || activeCategory || activeSection || currentFilters.status) && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {activeSite && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-soft text-teal border border-teal-soft">
              <span>{activeSite.name}</span>
              <button
                type="button"
                onClick={() => removeFilter("siteId")}
                className="hover:opacity-75 cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          {activeCategory && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-soft text-teal border border-teal-soft">
              <span>{activeCategory.name}</span>
              <button
                type="button"
                onClick={() => removeFilter("categoryId")}
                className="hover:opacity-75 cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          {activeSection && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-soft text-teal border border-teal-soft">
              <span>{activeSection.name}</span>
              <button
                type="button"
                onClick={() => removeFilter("sectionId")}
                className="hover:opacity-75 cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          {currentFilters.status && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-soft text-teal border border-teal-soft">
              <span>Status: {currentFilters.status.replace(/_/g, " ")}</span>
              <button
                type="button"
                onClick={() => removeFilter("status")}
                className="hover:opacity-75 cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => router.push("/resources")}
            className="text-xs font-bold text-teal hover:underline ml-2 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
