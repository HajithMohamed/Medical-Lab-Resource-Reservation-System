"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

interface OptionItem {
  id: string;
  name: string;
}

export interface EquipmentReportsFilterBarProps {
  isAdmin: boolean;
  sites: OptionItem[];
  sections: OptionItem[];
  categories: OptionItem[];
  currentFilters: {
    from?: string;
    to?: string;
    site?: string;
    section?: string;
    category?: string;
    kind?: string;
    outcome?: string;
  };
}

export function EquipmentReportsFilterBar({
  isAdmin,
  sites,
  sections,
  categories,
  currentFilters,
}: EquipmentReportsFilterBarProps) {
  const router = useRouter();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("tab", "reports");
    params.delete("page");
    router.replace(`/equipment?${params.toString()}`, { scroll: false });
  };

  const hasActiveFilters = Boolean(
    currentFilters.from ||
    currentFilters.to ||
    (currentFilters.site && currentFilters.site !== "all") ||
    (currentFilters.section && currentFilters.section !== "all") ||
    (currentFilters.category && currentFilters.category !== "all") ||
    (currentFilters.kind && currentFilters.kind !== "all") ||
    (currentFilters.outcome && currentFilters.outcome !== "all"),
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3.5 rounded-2xl border border-card-edge shadow-v4">
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
        {/* Date Range: From */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="filter-from" className="text-xs font-semibold text-muted">
            From:
          </label>
          <input
            id="filter-from"
            type="date"
            defaultValue={currentFilters.from ?? ""}
            onChange={(e) => handleFilterChange("from", e.target.value)}
            className="h-9 px-2.5 rounded-xl border border-card-edge bg-canvas text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
          />
        </div>

        {/* Date Range: To */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="filter-to" className="text-xs font-semibold text-muted">
            To:
          </label>
          <input
            id="filter-to"
            type="date"
            defaultValue={currentFilters.to ?? ""}
            onChange={(e) => handleFilterChange("to", e.target.value)}
            className="h-9 px-2.5 rounded-xl border border-card-edge bg-canvas text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
          />
        </div>

        {/* Site (Admin only) */}
        {isAdmin && (
          <select
            id="filter-site"
            value={currentFilters.site ?? "all"}
            onChange={(e) => handleFilterChange("site", e.target.value)}
            className="h-9 rounded-xl border border-card-edge bg-canvas px-3 text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
          >
            <option value="all">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        {/* Section */}
        <select
          id="filter-section"
          value={currentFilters.section ?? "all"}
          onChange={(e) => handleFilterChange("section", e.target.value)}
          className="h-9 rounded-xl border border-card-edge bg-canvas px-3 text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
        >
          <option value="all">All sections</option>
          {sections.map((sec) => (
            <option key={sec.id} value={sec.id}>
              {sec.name}
            </option>
          ))}
        </select>

        {/* Category */}
        <select
          id="filter-category"
          value={currentFilters.category ?? "all"}
          onChange={(e) => handleFilterChange("category", e.target.value)}
          className="h-9 rounded-xl border border-card-edge bg-canvas px-3 text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Kind */}
        <select
          id="filter-kind"
          value={currentFilters.kind ?? "all"}
          onChange={(e) => handleFilterChange("kind", e.target.value)}
          className="h-9 rounded-xl border border-card-edge bg-canvas px-3 text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
        >
          <option value="all">All record types</option>
          <option value="CALIBRATION">Calibration</option>
          <option value="PREVENTIVE_MAINTENANCE">Maintenance</option>
          <option value="REPAIR">Repair</option>
          <option value="PERFORMANCE_CHECK">Performance check</option>
          <option value="LIFECYCLE_REVIEW">Lifecycle review</option>
        </select>

        {/* Outcome */}
        <select
          id="filter-outcome"
          value={currentFilters.outcome ?? "all"}
          onChange={(e) => handleFilterChange("outcome", e.target.value)}
          className="h-9 rounded-xl border border-card-edge bg-canvas px-3 text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
        >
          <option value="all">All results</option>
          <option value="PASS">Pass</option>
          <option value="FAIL">Fail</option>
          <option value="NOT_DONE">Not done</option>
          <option value="REPLACE">Replace</option>
        </select>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => router.replace("/equipment?tab=reports", { scroll: false })}
          className="h-9 px-3 text-xs font-bold text-teal-deep hover:text-teal hover:bg-mint rounded-xl transition-colors cursor-pointer shrink-0"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
