"use client";

import * as React from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AutoFilter } from "@/components/auto-filter";

interface BookingsManageFilterProps {
  from: string;
  to: string;
  siteId?: string;
  resourceId?: string;
  person?: string;
  status: string;
  totalCount: number;
  showSiteFilter: boolean;
  sites: Array<{ id: string; name: string }>;
  resources: Array<{ id: string; name: string; siteId: string }>;
}

export function BookingsManageFilter({
  from,
  to,
  siteId,
  resourceId,
  person,
  status,
  totalCount,
  showSiteFilter,
  sites,
  resources,
}: BookingsManageFilterProps) {
  return (
    <AutoFilter
      action="/bookings/manage"
      className="p-4 rounded-2xl border border-card-edge bg-card shadow-v4 space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* From Date */}
        <div className="space-y-1">
          <label htmlFor="filter-from" className="text-xs font-semibold text-navy">
            From date
          </label>
          <div className="relative">
            <input
              id="filter-from"
              type="date"
              name="from"
              defaultValue={from}
              className="w-full h-9 px-2.5 rounded-xl border border-card-edge bg-canvas text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* To Date */}
        <div className="space-y-1">
          <label htmlFor="filter-to" className="text-xs font-semibold text-navy">
            To date
          </label>
          <div className="relative">
            <input
              id="filter-to"
              type="date"
              name="to"
              defaultValue={to}
              className="w-full h-9 px-2.5 rounded-xl border border-card-edge bg-canvas text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Site Filter */}
        {showSiteFilter && (
          <div className="space-y-1">
            <label htmlFor="filter-site" className="text-xs font-semibold text-navy">
              Site
            </label>
            <select
              id="filter-site"
              name="siteId"
              defaultValue={siteId ?? "all"}
              className="w-full h-9 rounded-xl border border-card-edge bg-canvas px-3 text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
            >
              <option value="all">All sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Resource Filter */}
        <div className="space-y-1">
          <label htmlFor="filter-resource" className="text-xs font-semibold text-navy">
            Resource
          </label>
          <select
            id="filter-resource"
            name="resourceId"
            defaultValue={resourceId ?? "all"}
            className="w-full h-9 rounded-xl border border-card-edge bg-canvas px-3 text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
          >
            <option value="all">All resources</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Person Filter */}
        <div className="space-y-1">
          <label htmlFor="filter-person" className="text-xs font-semibold text-navy">
            Booked by
          </label>
          <div className="relative">
            <input
              id="filter-person"
              type="text"
              name="person"
              placeholder="Name search..."
              defaultValue={person ?? ""}
              className="w-full h-9 px-3 rounded-xl border border-card-edge bg-canvas text-xs font-semibold text-navy focus:border-teal outline-none placeholder:text-muted"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-1">
          <label htmlFor="filter-status" className="text-xs font-semibold text-navy">
            Status
          </label>
          <select
            id="filter-status"
            name="status"
            defaultValue={status}
            className="w-full h-9 rounded-xl border border-card-edge bg-canvas px-3 text-xs font-semibold text-navy focus:border-teal outline-none cursor-pointer"
          >
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="ALL">All statuses</option>
          </select>
        </div>
      </div>

      {/* Footer Info & Reset Action */}
      <div className="flex items-center justify-between pt-2 border-t border-card-edge">
        <span className="text-xs text-muted">
          Found <strong className="text-navy font-bold">{totalCount}</strong>{" "}
          {totalCount === 1 ? "booking" : "bookings"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            asChild
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Clear filters"
            className="h-8 text-xs font-semibold text-teal-deep hover:text-teal hover:bg-mint rounded-xl transition-colors cursor-pointer"
          >
            <Link href="/bookings/manage">
              <RotateCcw className="size-3.5 mr-1" />
              <span>Reset</span>
            </Link>
          </Button>
        </div>
      </div>
    </AutoFilter>
  );
}
