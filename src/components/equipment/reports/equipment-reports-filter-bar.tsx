"use client";

import * as React from "react";
import { FilterBar } from "@/components/filter-bar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const hasActiveFilters = Boolean(
    currentFilters.from ||
    currentFilters.to ||
    currentFilters.site ||
    currentFilters.section ||
    currentFilters.category ||
    currentFilters.kind ||
    currentFilters.outcome,
  );

  return (
    <FilterBar
      action="/equipment"
      hasActiveFilters={hasActiveFilters}
      clearHref="/equipment?tab=reports"
    >
      <input type="hidden" name="tab" value="reports" />

      {/* Date Range: From */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="filter-from" className="text-xs font-mono text-[#94a3b8]">
          From:
        </label>
        <Input
          id="filter-from"
          name="from"
          type="date"
          defaultValue={currentFilters.from ?? ""}
          className="h-8 w-34 text-xs font-mono bg-[#0b132b] border-[#334155] text-white"
        />
      </div>

      {/* Date Range: To */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="filter-to" className="text-xs font-mono text-[#94a3b8]">
          To:
        </label>
        <Input
          id="filter-to"
          name="to"
          type="date"
          defaultValue={currentFilters.to ?? ""}
          className="h-8 w-34 text-xs font-mono bg-[#0b132b] border-[#334155] text-white"
        />
      </div>

      {/* Site (Admin only) */}
      {isAdmin && (
        <Select name="site" defaultValue={currentFilters.site ?? "all"}>
          <SelectTrigger className="h-8 w-36 text-xs font-mono bg-[#0b132b] border-[#334155] text-white">
            <SelectValue placeholder="All sites" />
          </SelectTrigger>
          <SelectContent className="bg-[#141c2b] border-[#334155] text-white text-xs font-mono">
            <SelectItem value="all">All sites</SelectItem>
            {sites.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Section */}
      <Select name="section" defaultValue={currentFilters.section ?? "all"}>
        <SelectTrigger className="h-8 w-36 text-xs font-mono bg-[#0b132b] border-[#334155] text-white">
          <SelectValue placeholder="All sections" />
        </SelectTrigger>
        <SelectContent className="bg-[#141c2b] border-[#334155] text-white text-xs font-mono">
          <SelectItem value="all">All sections</SelectItem>
          {sections.map((sec) => (
            <SelectItem key={sec.id} value={sec.id}>
              {sec.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Category */}
      <Select name="category" defaultValue={currentFilters.category ?? "all"}>
        <SelectTrigger className="h-8 w-36 text-xs font-mono bg-[#0b132b] border-[#334155] text-white">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent className="bg-[#141c2b] border-[#334155] text-white text-xs font-mono">
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Kind */}
      <Select name="kind" defaultValue={currentFilters.kind ?? "all"}>
        <SelectTrigger className="h-8 w-40 text-xs font-mono bg-[#0b132b] border-[#334155] text-white">
          <SelectValue placeholder="All record types" />
        </SelectTrigger>
        <SelectContent className="bg-[#141c2b] border-[#334155] text-white text-xs font-mono">
          <SelectItem value="all">All record types</SelectItem>
          <SelectItem value="CALIBRATION">Calibration</SelectItem>
          <SelectItem value="PREVENTIVE_MAINTENANCE">Maintenance</SelectItem>
          <SelectItem value="REPAIR">Repair</SelectItem>
          <SelectItem value="PERFORMANCE_CHECK">Performance check</SelectItem>
          <SelectItem value="LIFECYCLE_REVIEW">Lifecycle review</SelectItem>
        </SelectContent>
      </Select>

      {/* Outcome */}
      <Select name="outcome" defaultValue={currentFilters.outcome ?? "all"}>
        <SelectTrigger className="h-8 w-32 text-xs font-mono bg-[#0b132b] border-[#334155] text-white">
          <SelectValue placeholder="All results" />
        </SelectTrigger>
        <SelectContent className="bg-[#141c2b] border-[#334155] text-white text-xs font-mono">
          <SelectItem value="all">All results</SelectItem>
          <SelectItem value="PASS">Pass</SelectItem>
          <SelectItem value="FAIL">Fail</SelectItem>
          <SelectItem value="NOT_DONE">Not done</SelectItem>
          <SelectItem value="REPLACE">Replace</SelectItem>
        </SelectContent>
      </Select>
    </FilterBar>
  );
}
