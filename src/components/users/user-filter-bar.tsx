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
    // Reset page to 1 on filter change
    params.delete("page");

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleClearFilters = () => {
    router.push(pathname);
  };

  const hasActiveFilters = Boolean(currentSiteId || currentRole || currentStatus);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#141c2b] p-3 rounded-lg border border-[#334155] shadow-xs">
      <div className="flex flex-wrap items-center gap-4 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-site"
            className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6] shrink-0"
          >
            Site
          </label>
          <select
            id="filter-site"
            value={currentSiteId ?? ""}
            onChange={(e) => handleFilterChange("siteId", e.target.value)}
            className="h-9 rounded-md border border-[#334155] bg-[#060e1d] px-3 py-1 text-xs font-mono text-[#dbe2f8] focus:border-[#6cd8cb] focus:outline-none cursor-pointer transition-colors"
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
          <label
            htmlFor="filter-role"
            className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6] shrink-0"
          >
            Role
          </label>
          <select
            id="filter-role"
            value={currentRole ?? ""}
            onChange={(e) => handleFilterChange("role", e.target.value)}
            className="h-9 rounded-md border border-[#334155] bg-[#060e1d] px-3 py-1 text-xs font-mono text-[#dbe2f8] focus:border-[#6cd8cb] focus:outline-none cursor-pointer transition-colors"
          >
            <option value="">All roles</option>
            <option value="STAFF">Staff</option>
            <option value="MANAGER">Site Manager</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-status"
            className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6] shrink-0"
          >
            Status
          </label>
          <select
            id="filter-status"
            value={currentStatus ?? ""}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="h-9 rounded-md border border-[#334155] bg-[#060e1d] px-3 py-1 text-xs font-mono text-[#dbe2f8] focus:border-[#6cd8cb] focus:outline-none cursor-pointer transition-colors"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="MUST_CHANGE_PASSWORD">Must change password</option>
            <option value="LOCKED">Locked</option>
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
          className="h-9 text-xs font-mono text-[#94a3b8] hover:text-white"
        >
          <X className="size-3.5 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
