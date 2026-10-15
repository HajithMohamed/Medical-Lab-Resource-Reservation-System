"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserFilterBarProps {
  sites: Array<{ id: string; name: string }>;
  currentSiteId?: string;
  currentRole?: string;
  currentStatus?: string;
}

export function UserFilterBar({
  sites,
  currentSiteId,
  currentRole,
  currentStatus,
}: UserFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const handleClearFilters = () => {
    router.replace(pathname, { scroll: false });
  };

  const hasActiveFilters = Boolean(currentSiteId || currentRole || currentStatus);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-card-edge shadow-v4">
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <label htmlFor="filter-site" className="text-xs font-bold text-navy shrink-0">
            Site
          </label>
          <select
            id="filter-site"
            value={currentSiteId ?? ""}
            onChange={(e) => handleFilterChange("siteId", e.target.value)}
            className="h-10 rounded-xl border border-card-edge bg-canvas px-3 text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
          >
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filter-role" className="text-xs font-bold text-navy shrink-0">
            Role
          </label>
          <select
            id="filter-role"
            value={currentRole ?? ""}
            onChange={(e) => handleFilterChange("role", e.target.value)}
            className="h-10 rounded-xl border border-card-edge bg-canvas px-3 text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
          >
            <option value="">All roles</option>
            <option value="STAFF">Staff</option>
            <option value="MANAGER">Site Manager</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filter-status" className="text-xs font-bold text-navy shrink-0">
            Status
          </label>
          <select
            id="filter-status"
            value={currentStatus ?? ""}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="h-10 rounded-xl border border-card-edge bg-canvas px-3 text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="LOCKED">Locked</option>
            <option value="MUST_CHANGE_PASSWORD">Must change password</option>
            <option value="INACTIVE">Deactivated</option>
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="h-9 px-3 text-xs font-bold text-teal-deep hover:text-teal hover:bg-mint rounded-xl transition-colors shrink-0"
        >
          <X className="size-3.5 mr-1" />
          <span>Clear filters</span>
        </Button>
      )}
    </div>
  );
}
