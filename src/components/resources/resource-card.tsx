import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/category-icon";
import { ResourceStatusTag } from "@/components/resource-status-tag";
import { formatMinutes } from "@/lib/format";
import type { ResourceListItem } from "@/services/resources";

interface ResourceCardProps {
  resource: ResourceListItem;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const isRoom = resource.category.iconKey === "room";
  const capacityText = isRoom && resource.capacity ? `, ${resource.capacity} seats` : "";
  const subtitle = `${resource.category.name}, up to ${formatMinutes(resource.category.maxBookingMinutes)}${capacityText}`;

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container p-3.5 space-y-3 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <CategoryIcon
            iconKey={resource.category.iconKey}
            className="size-8 rounded-lg shrink-0 mt-0.5"
          />
          <div className="min-w-0">
            <Link
              href={`/resources/${resource.id}`}
              className="font-semibold text-sm text-on-surface hover:text-primary transition-colors truncate block"
            >
              {resource.name}
            </Link>
            <p className="font-mono text-[10.5px] text-on-surface-variant truncate">{subtitle}</p>
          </div>
        </div>
        <ResourceStatusTag status={resource.status} className="shrink-0" />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-outline-variant/60">
        <div>
          <span className="text-on-surface-variant text-[11px] block">Site:</span>
          <span className="font-medium text-on-surface text-xs">{resource.site.name}</span>
        </div>
        <div>
          <span className="text-on-surface-variant text-[11px] block">Section:</span>
          <span className="font-mono text-on-surface text-xs">{resource.section.name}</span>
        </div>
        <div className="col-span-2">
          <span className="text-on-surface-variant text-[11px] block">Location:</span>
          {resource.location ? (
            <span className="font-medium text-on-surface text-xs">{resource.location}</span>
          ) : (
            <span className="text-on-surface-variant/60 italic text-xs">Not set</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-7.5 px-3 text-xs border-outline-variant hover:bg-surface-container-high"
        >
          <Link href={`/resources/${resource.id}`}>Details</Link>
        </Button>

        {resource.status === "ACTIVE" && (
          <Button
            asChild
            size="sm"
            className="h-7.5 px-3 text-xs bg-primary text-primary-foreground font-semibold hover:brightness-110 shadow-2xs"
          >
            <Link href={`/bookings/new?resourceId=${resource.id}`}>Reserve</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
