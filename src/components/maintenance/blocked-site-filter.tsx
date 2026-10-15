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
      <Building2 className="size-3.5 text-muted shrink-0" />
      <select
        name="siteId"
        value={selectedSiteId}
        onChange={handleChange}
        className="h-9 rounded-xl bg-canvas border border-card-edge px-3 text-xs text-navy font-semibold focus:border-teal outline-none cursor-pointer"
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
