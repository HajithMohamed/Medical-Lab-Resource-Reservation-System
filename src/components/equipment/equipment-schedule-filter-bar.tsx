"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface EquipmentScheduleFilterBarProps {
  isAdmin: boolean;
  sites: Array<{ id: string; name: string }>;
  currentSiteId?: string;
  currentStatus?: string;
}

export function EquipmentScheduleFilterBar({
  isAdmin,
  sites,
  currentSiteId,
  currentStatus = "ALL",
}: EquipmentScheduleFilterBarProps) {
  const router = useRouter();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "schedule");
    if (value && value !== "ALL") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.replace(`/equipment?${params.toString()}`, { scroll: false });
  };

  const handleClear = () => {
    router.replace("/equipment?tab=schedule", { scroll: false });
  };

  const hasActiveFilters = Boolean(currentSiteId || (currentStatus && currentStatus !== "ALL"));

  return (
    <div className="rounded-2xl bg-card border border-card-edge p-3 sm:p-3.5 shadow-v4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {isAdmin && sites.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="schedule-filter-site" className="text-xs font-bold text-navy shrink-0">
              Site:
            </label>
            <select
              id="schedule-filter-site"
              value={currentSiteId ?? ""}
              onChange={(e) => handleFilterChange("siteId", e.target.value)}
              className="h-9 rounded-xl border border-card-edge bg-canvas px-3 text-xs font-semibold text-navy outline-none focus:border-teal cursor-pointer"
              aria-label="Filter by site"
            >
              <option value="">All sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <label htmlFor="schedule-filter-status" className="text-xs font-bold text-navy shrink-0">
            Status:
          </label>
          <select
            id="schedule-filter-status"
            value={currentStatus}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="h-9 rounded-xl border border-card-edge bg-canvas px-3 text-xs font-semibold text-navy outline-none focus:border-teal cursor-pointer"
            aria-label="Filter by schedule status"
          >
            <option value="ALL">All schedules</option>
            <option value="OVERDUE">Overdue or failed</option>
            <option value="DUE_TODAY">Due today</option>
            <option value="DUE_SOON">Due soon (30 days)</option>
            <option value="CURRENT">Current</option>
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClear}
          className="h-8 px-2.5 text-xs font-bold text-teal-deep hover:text-teal hover:bg-mint rounded-xl transition-colors cursor-pointer flex items-center gap-1 shrink-0"
        >
          <X className="size-3.5" />
          <span>Clear filters</span>
        </button>
      )}
    </div>
  );
}
