"use client";

import * as React from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
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
      className="p-4 rounded-xl border border-[#334155] bg-[#141c2b] shadow-xs space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* From Date */}
        <div className="space-y-1">
          <label htmlFor="filter-from" className="text-xs font-mono font-medium text-slate-300">
            From date
          </label>
          <div className="relative">
            <Input
              id="filter-from"
              type="date"
              name="from"
              defaultValue={from}
              className="bg-[#0b1322] border-[#334155] text-xs font-mono text-slate-100 cursor-pointer"
            />
          </div>
        </div>

        {/* To Date */}
        <div className="space-y-1">
          <label htmlFor="filter-to" className="text-xs font-mono font-medium text-slate-300">
            To date
          </label>
          <div className="relative">
            <Input
              id="filter-to"
              type="date"
              name="to"
              defaultValue={to}
              className="bg-[#0b1322] border-[#334155] text-xs font-mono text-slate-100 cursor-pointer"
            />
          </div>
        </div>

        {/* Site Filter */}
        {showSiteFilter && (
          <div className="space-y-1">
            <label htmlFor="filter-site" className="text-xs font-mono font-medium text-slate-300">
              Site
            </label>
            <select
              id="filter-site"
              name="siteId"
              defaultValue={siteId ?? "all"}
              className="w-full h-9 rounded-md border border-[#334155] bg-[#0b1322] px-3 py-1 text-xs font-mono text-slate-100 outline-none focus:ring-1 focus:ring-[#6cd8cb] cursor-pointer"
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
          <label htmlFor="filter-resource" className="text-xs font-mono font-medium text-slate-300">
            Resource
          </label>
          <select
            id="filter-resource"
            name="resourceId"
            defaultValue={resourceId ?? "all"}
            className="w-full h-9 rounded-md border border-[#334155] bg-[#0b1322] px-3 py-1 text-xs font-mono text-slate-100 outline-none focus:ring-1 focus:ring-[#6cd8cb] cursor-pointer"
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
          <label htmlFor="filter-person" className="text-xs font-mono font-medium text-slate-300">
            Booked by
          </label>
          <div className="relative">
            <Input
              id="filter-person"
              type="text"
              name="person"
              placeholder="Name search..."
              defaultValue={person ?? ""}
              className="bg-[#0b1322] border-[#334155] text-xs text-slate-100"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-1">
          <label htmlFor="filter-status" className="text-xs font-mono font-medium text-slate-300">
            Status
          </label>
          <select
            id="filter-status"
            name="status"
            defaultValue={status}
            className="w-full h-9 rounded-md border border-[#334155] bg-[#0b1322] px-3 py-1 text-xs font-mono text-slate-100 outline-none focus:ring-1 focus:ring-[#6cd8cb] cursor-pointer"
          >
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="ALL">All statuses</option>
          </select>
        </div>
      </div>

      {/* Footer Info & Reset Action */}
      <div className="flex items-center justify-between pt-2 border-t border-[#334155]/60">
        <span className="text-xs font-mono text-slate-400">
          Found <strong className="text-slate-100">{totalCount}</strong>{" "}
          {totalCount === 1 ? "booking" : "bookings"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            asChild
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Clear filters"
            className="h-8 text-xs font-mono text-slate-400 hover:text-slate-200"
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
