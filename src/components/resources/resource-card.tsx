import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/category-icon";
import { ResourceStatusTag } from "@/components/resource-status-tag";
import { formatMinutes } from "@/lib/format";
import type { ResourceListItem } from "@/services/resources";
import type { Role } from "@/generated/prisma/client";
import { ResourceEditDialog } from "@/components/resources/resource-edit-dialog";

interface ResourceCardProps {
  resource: ResourceListItem;
  actorRole?: Role;
  actorSiteId?: string | null;
  sites?: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string; maxBookingMinutes: number; iconKey: string }>;
  sections?: Array<{ id: string; name: string }>;
}

export function ResourceCard({
  resource,
  actorRole,
  actorSiteId,
  sites,
  categories,
  sections,
}: ResourceCardProps) {
  const isRoom = resource.category.iconKey === "room";
  const capacityText = isRoom && resource.capacity ? `, ${resource.capacity} seats` : "";
  const subtitle = `${resource.category.name} • Max slot: ${formatMinutes(resource.category.maxBookingMinutes)}${capacityText}`;
  const canManage =
    actorRole === "ADMIN" ||
    (actorRole === "MANAGER" && actorSiteId && actorSiteId === resource.siteId);

  return (
    <div className="rounded-lg border border-[#334155] bg-[#141c2b] p-4 space-y-3 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#18202f] border border-[#334155] flex items-center justify-center text-[#6cd8cb] shrink-0 mt-0.5">
            <CategoryIcon
              iconKey={resource.category.iconKey}
              className="size-5 shrink-0"
            />
          </div>
          <div className="min-w-0">
            <Link
              href={`/resources/${resource.id}`}
              className="font-semibold text-base text-white hover:text-[#6cd8cb] transition-colors truncate block"
            >
              {resource.name}
            </Link>
            <p className="text-xs font-mono text-[#94a3b8]">{subtitle}</p>
          </div>
        </div>
        <ResourceStatusTag status={resource.status} className="shrink-0" />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1 border-t border-[#334155]/60">
        <div>
          <span className="text-[#94a3b8] block">Site:</span>
          <span className="font-medium text-white">{resource.site.name}</span>
        </div>
        <div>
          <span className="text-[#94a3b8] block">Section:</span>
          <span className="font-medium text-white">{resource.section.name}</span>
        </div>
        <div className="col-span-2">
          <span className="text-[#94a3b8] block">Location:</span>
          {resource.location ? (
            <span className="font-medium text-white">{resource.location}</span>
          ) : (
            <span className="text-[#94a3b8] italic">Not set</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#334155]/40">
        <div className="flex items-center gap-1.5">
          <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs font-mono">
            <Link href={`/resources/${resource.id}`}>Details</Link>
          </Button>
          {canManage && sites && categories && sections && (
            <ResourceEditDialog
              resource={resource}
              actorRole={actorRole}
              actorSiteId={actorSiteId ?? null}
              sites={sites}
              categories={categories}
              sections={sections}
            />
          )}
        </div>

        {resource.status === "ACTIVE" && (
          <Button asChild size="sm" className="h-8 px-3 text-xs font-mono font-semibold bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732]">
            <Link href={`/bookings/new?resourceId=${resource.id}`}>Book Slot</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
