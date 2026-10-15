"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

export interface BlockedSiteFilterProps {
  sites: { id: string; name: string }[];
  selectedSiteId?: string;
  range: "upcoming" | "recent";
}

export function BlockedSiteFilter({ sites, selectedSiteId = "", range }: BlockedSiteFilterProps) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const siteId = e.target.value;
    const params = new URLSearchParams();
    params.set("tab", "blocked");
    params.set("range", range);
    if (siteId) {
      params.set("siteId", siteId);
    }
    router.replace(`/equipment?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center gap-2">
      <Building2 className="size-3.5 text-[#879390]" />
      <select
        name="siteId"
        value={selectedSiteId}
        onChange={handleChange}
        className="h-8 rounded-md bg-[#060e1d] border border-[#334155] px-2.5 text-xs text-slate-200 font-mono focus:border-[#6cd8cb] focus:outline-hidden cursor-pointer"
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
  );
}
