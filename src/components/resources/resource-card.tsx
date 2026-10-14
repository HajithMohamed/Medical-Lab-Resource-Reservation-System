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
  const subtitle = `${resource.category.name}, up to ${formatMinutes(resource.category.maxBookingMinutes)}${capacityText}`;
  const canManage =
    actorRole === "ADMIN" ||
    (actorRole === "MANAGER" && actorSiteId && actorSiteId === resource.siteId);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <CategoryIcon
            iconKey={resource.category.iconKey}
            className="size-8 rounded-lg shrink-0 mt-0.5"
          />
          <div className="min-w-0">
            <Link
              href={`/resources/${resource.id}`}
              className="font-bold text-base text-foreground hover:underline truncate block"
            >
              {resource.name}
            </Link>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <ResourceStatusTag status={resource.status} className="shrink-0" />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/60">
        <div>
          <span className="text-muted-foreground block">Site:</span>
          <span className="font-medium text-foreground">{resource.site.name}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Section:</span>
          <span className="font-medium text-foreground">{resource.section.name}</span>
        </div>
        <div className="col-span-2">
          <span className="text-muted-foreground block">Location:</span>
          {resource.location ? (
            <span className="font-medium text-foreground">{resource.location}</span>
          ) : (
            <span className="text-muted-foreground italic">Not set</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs">
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
          <Button asChild size="sm" className="h-8 text-xs font-semibold">
            <Link href={`/bookings/new?resourceId=${resource.id}`}>Book</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
